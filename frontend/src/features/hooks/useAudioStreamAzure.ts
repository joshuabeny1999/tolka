import { useState, useRef, useCallback, useEffect } from 'react';
import type {TranscriptSegment, UseAudioStreamReturn} from '../types';


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

    const handleFinalResult = (newSentence: string) => {
        const newSegment: TranscriptSegment = {
            id: crypto.randomUUID(), // Oder Date.now().toString()
            text: newSentence.trim(),
            timestamp: Date.now(),
            isFinal: true
        };

        // Array update statt String concatenation
        setSegments(prev => [...prev, newSegment]);

        // Partial leeren, da Satz committed ist
        setPartialText("");
    };

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

    // 2. Helper: Float32 to Int16 (Azure Format)
    const convertFloat32ToInt16 = (buffer: Float32Array) => {
        let l = buffer.length;
        const buf = new Int16Array(l);
        while (l--) {
            const s = Math.max(-1, Math.min(1, buffer[l]));
            buf[l] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return buf.buffer;
    };

    const stopRecording = useCallback(() => {
        isRecordingRef.current = false;
        setIsRecording(false);

        // Reset the duplicate tracker so new sessions start fresh
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
            socketRef.current.close();
            socketRef.current = null;
        }
        setPartialText('');
    }, []);

    const startRecording = useCallback(async () => {
        setError(null);
        isRecordingRef.current = true;
        // Reset check on start just to be safe
        lastCommittedSegmentRef.current = null;

        try {
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            const initAudio = async () => {
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
            };

            socket.onopen = async () => {
                console.log('WS: Connected');
                if (!isRecordingRef.current) {
                    socket.close();
                    return;
                }

                try {
                    await initAudio();
                    setIsRecording(true);
                } catch (audioErr) {
                    console.error("Audio Init Error:", audioErr);
                    setError('Microphone could not be started.');
                    stopRecording();
                }
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (!data.text) return;

                    const trimmedText = data.text.trim();
                    if (!trimmedText) return;

                    if (data.is_partial) {
                        setPartialText(trimmedText);
                    } else {
                        // --- DUPLICATE CHECK START ---
                        // If the new text is identical to the last one we committed, ignore it.
                        if (lastCommittedSegmentRef.current === trimmedText) {
                            console.warn('Dropped duplicate segment:', trimmedText);
                            return;
                        }

                        lastCommittedSegmentRef.current = trimmedText;

                        handleFinalResult(trimmedText);
                        setPartialText('');
                    }
                } catch (e) {
                    console.error('JSON Parse Error', e);
                }
            };

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
    }, [wsUrl, stopRecording]);

    useEffect(() => {
        return () => {
            if (isRecordingRef.current) stopRecording();
        };
    }, [stopRecording]);

    return {
        isRecording,
        segments,
        partialText,
        startRecording,
        stopRecording,
        error,
    };
};