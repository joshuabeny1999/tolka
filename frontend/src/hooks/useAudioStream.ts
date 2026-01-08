import { useState, useRef, useCallback } from 'react';

interface UseAudioStreamReturn {
    isRecording: boolean;
    transcription: string;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    error: string | null;
}

export const useAudioStream = (wsUrl: string): UseAudioStreamReturn => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcription, setTranscription] = useState('');
    const [error, setError] = useState<string | null>(null);

    const socketRef = useRef<WebSocket | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    const startRecording = useCallback(async () => {
        setError(null);

        try {
            // 1. Get Microphone Access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // 2. Initialize WebSocket
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                console.log('WebSocket connected');
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    // Append new text. In a real app, you might want to handle 'is_partial' logic here.
                    if (data.text) {
                        setTranscription((prev) => prev + ' ' + data.text);
                    }
                } catch (err) {
                    console.error('Error parsing JSON:', err);
                }
            };

            socket.onerror = (event) => {
                console.error('WebSocket error:', event);
                setError('WebSocket connection failed');
            };

            socket.onclose = () => {
                console.log('WebSocket closed');
            };

            // 3. Initialize MediaRecorder
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm',
            });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
                    socket.send(event.data);
                }
            };

            // 4. Start Recording
            mediaRecorder.start(250);
            setIsRecording(true);

        } catch (err) {
            console.error('Error accessing microphone:', err);
            setError('Could not access microphone. Please allow permissions.');
        }
    }, [wsUrl]);

    const stopRecording = useCallback(() => {
        // 1. Stop MediaRecorder
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            // Stop all audio tracks to release the microphone "red dot"
            mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
        }

        // 2. Close WebSocket
        if (socketRef.current) {
            socketRef.current.close();
        }

        setIsRecording(false);
    }, []);

    return {
        isRecording,
        transcription,
        startRecording,
        stopRecording,
        error,
    };
};