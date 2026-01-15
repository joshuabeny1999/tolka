import { useState, useRef, useCallback, useEffect } from 'react';
import type { TranscriptSegment, UseAudioStreamReturn } from '../types';

export const useAudioStreamDeepgram = (wsUrl: string): UseAudioStreamReturn => {
    const [isRecording, setIsRecording] = useState(false);
    const [segments, setSegments] = useState<TranscriptSegment[]>([]);
    const [partialText, setPartialText] = useState('');
    const [error, setError] = useState<string | null>(null);

    const socketRef = useRef<WebSocket | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null); // Ref to track stream for cleanup
    const isRecordingRef = useRef(false);

    // --- SHARED LOGIC: Message Handling ---
    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            const data = JSON.parse(event.data);

            if (!data.text) return;

            if (data.is_partial) {
                setPartialText(data.text);
            } else {
                // Final Result Handling
                const newSegment: TranscriptSegment = {
                    id: crypto.randomUUID(),
                    text: data.text.trim(),
                    timestamp: Date.now(),
                    isFinal: true
                };

                setSegments(prev => [...prev, newSegment]);
                setPartialText("");
            }
        } catch (err) {
            console.error('JSON Error:', err);
        }
    }, []);

    // --- SHARED LOGIC: Cleanup ---
    const cleanup = useCallback(() => {
        isRecordingRef.current = false;
        setIsRecording(false);

        // Stop MediaRecorder
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current = null;

        // Stop Tracks (Microphone)
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }

        // Close Socket
        if (socketRef.current) {
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
        if (socketRef.current?.readyState === WebSocket.OPEN) return;

        cleanup();

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

        cleanup();
        isRecordingRef.current = true;

        try {
            // 1. Get Mic Access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            streamRef.current = stream;

            // 2. Open Socket
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                console.log('WS: Connected (Deepgram Host)');
                // Only start sending audio if user hasn't stopped meanwhile
                if (isRecordingRef.current && mediaRecorderRef.current?.state === 'inactive') {
                    mediaRecorderRef.current.start(250); // Send slices every 250ms
                    setIsRecording(true);
                } else {
                    socket.close(); // Safety close
                }
            };

            socket.onmessage = handleMessage;

            socket.onerror = () => {
                if (isRecordingRef.current) setError('WebSocket connection failed');
            };

            socket.onclose = () => {
                if (isRecordingRef.current) {
                    stopRecording();
                    setError('Connection closed by server');
                }
            };

            // 3. Setup MediaRecorder
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
                    socket.send(event.data);
                }
            };

        } catch (err) {
            console.error(err);
            setError('Could not access microphone.');
            isRecordingRef.current = false;
            cleanup();
        }
    }, [wsUrl, cleanup, handleMessage, stopRecording]);

    useEffect(() => {
        return () => cleanup();
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