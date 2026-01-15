import { useState, useRef, useCallback, useEffect } from 'react';
import type { TranscriptSegment, UseAudioStreamReturn } from '../types';

export const useAudioStreamAzure = (wsUrl: string): UseAudioStreamReturn => {
    const [isRecording, setIsRecording] = useState(false);
    const [segments, setSegments] = useState<TranscriptSegment[]>([]);
    const [partialText, setPartialText] = useState('');
    const [error, setError] = useState<string | null>(null);

    const socketRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const isRecordingRef = useRef(false);

    const lastCommittedSegmentRef = useRef<string | null>(null);

    // --- HELPER FUNCTIONS (Audio Processing) ---
    // Diese hängen nicht vom State ab und können stabil bleiben
    const downsampleBuffer = (buffer: Float32Array, inputSampleRate: number, targetSampleRate: number) => {
        if (inputSampleRate === targetSampleRate) {
            return buffer;
        }
        const sampleRateRatio = inputSampleRate / targetSampleRate;
        const newLength = Math.round(buffer.length / sampleRateRatio);
        const result = new Float32Array(newLength);

        let offsetResult = 0;
        let offsetBuffer = 0;

        while (offsetResult < result.length) {
            const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
            let accum = 0, count = 0;
            for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
                accum += buffer[i];
                count++;
            }
            result[offsetResult] = accum / count;
            offsetResult++;
            offsetBuffer = nextOffsetBuffer;
        }
        return result;
    };

    const convertFloat32ToInt16 = (buffer: Float32Array) => {
        let l = buffer.length;
        const buf = new Int16Array(l);
        while (l--) {
            const s = Math.max(-1, Math.min(1, buffer[l]));
            buf[l] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return buf.buffer;
    };

    // --- SHARED LOGIC: Message Handling ---
    // Ausgelagert, damit sowohl Host als auch Viewer Nachrichten verarbeiten können
    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            const data = JSON.parse(event.data);
            if (!data.text) return;

            const trimmedText = data.text.trim();
            if (!trimmedText) return;

            if (data.is_partial) {
                setPartialText(trimmedText);
            } else {
                // Duplicate Check
                if (lastCommittedSegmentRef.current === trimmedText) {
                    return;
                }
                lastCommittedSegmentRef.current = trimmedText;

                // Final Result Handling
                const newSegment: TranscriptSegment = {
                    id: crypto.randomUUID(),
                    text: trimmedText,
                    timestamp: Date.now(),
                    isFinal: true
                };

                setSegments(prev => [...prev, newSegment]);
                setPartialText("");
            }
        } catch (e) {
            console.error('JSON Parse Error', e);
        }
    }, []);

    // --- SHARED LOGIC: Cleanup ---
    // Ausgelagert, um Code-Duplikation zu vermeiden und sicheren Reset zu garantieren
    const cleanup = useCallback(() => {
        isRecordingRef.current = false;
        setIsRecording(false);
        lastCommittedSegmentRef.current = null;

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (socketRef.current) {
            // Nur schließen, wenn noch offen, um Fehler zu vermeiden
            if (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING) {
                socketRef.current.close();
            }
            socketRef.current = null;
        }
    }, []);

    const stopRecording = useCallback(() => {
        cleanup();
        setPartialText('');
    }, [cleanup]);

    // --- VIEWER CONNECTION (Listen Only) ---
    const connectViewer = useCallback(() => {
        if (!wsUrl) return;
        // Falls schon verbunden, nichts tun
        if (socketRef.current?.readyState === WebSocket.OPEN) return;

        cleanup(); // Safety Reset vor neuer Verbindung

        try {
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                console.log('Viewer Connected (Listen Only)');
                // WICHTIG: UI Status aktualisieren
                setIsRecording(true);
                isRecordingRef.current = true;
            };

            socket.onmessage = handleMessage;

            socket.onerror = () => {
                setError('Viewer Connection Error');
                // Bei Fehler auch Status zurücksetzen
                setIsRecording(false);
                isRecordingRef.current = false;
            };

            socket.onclose = () => {
                console.log("Viewer Disconnected");
                setIsRecording(false);
                isRecordingRef.current = false;
            };

        } catch (err) {
            setError('Viewer Connection Failed');
            setIsRecording(false);
        }
    }, [wsUrl, cleanup, handleMessage]);

    // --- HOST CONNECTION (Recording) ---
    const startRecording = useCallback(async () => {
        setError(null);

        if (!wsUrl) {
            setError("No Session URL");
            return;
        }

        // Clean slate
        cleanup();

        isRecordingRef.current = true;

        try {
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            // Audio erst initialisieren, wenn Socket offen ist
            socket.onopen = async () => {
                console.log('WS: Connected (Host)');

                // Falls User inzwischen gestoppt hat
                if (!isRecordingRef.current) {
                    socket.close();
                    return;
                }

                try {
                    // Audio Setup
                    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
                    audioContextRef.current = context;

                    const stream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true,
                            channelCount: 1
                        }
                    });
                    streamRef.current = stream;

                    const source = context.createMediaStreamSource(stream);
                    sourceRef.current = source;

                    const processor = context.createScriptProcessor(4096, 1, 1);
                    processorRef.current = processor;

                    processor.onaudioprocess = (e) => {
                        if (socket.readyState === WebSocket.OPEN) {
                            const inputData = e.inputBuffer.getChannelData(0);
                            const downsampledData = downsampleBuffer(inputData, context.sampleRate, 16000);
                            const pcmData = convertFloat32ToInt16(downsampledData);
                            socket.send(pcmData);
                        }
                    };

                    source.connect(processor);
                    processor.connect(context.destination);

                    setIsRecording(true);

                } catch (audioErr) {
                    console.error("Audio Init Error:", audioErr);
                    setError('Microphone could not be started.');
                    cleanup();
                }
            };

            socket.onmessage = handleMessage; // Nutzt die geteilte Logik

            socket.onerror = () => {
                if (isRecordingRef.current) setError('WebSocket Error');
            };

            socket.onclose = () => {
                if (isRecordingRef.current) stopRecording();
            };

        } catch (err) {
            console.error(err);
            setError('Connection Error');
            isRecordingRef.current = false;
        }
    }, [wsUrl, stopRecording, cleanup, handleMessage]); // Dependencies aktualisiert

    // Cleanup bei Unmount des Hooks
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);

    return {
        isRecording,
        segments,
        partialText,
        startRecording,
        stopRecording,
        connectViewer,
        error,
    };
};