import { useRef, useCallback } from 'react';
import type { UseAudioStreamReturn } from '../types';
import { useBaseAudioStream } from './useBaseAudioStream';

export const useAudioStreamDeepgram = (wsUrl: string): UseAudioStreamReturn => {
    const {
        isRecording, segments, partialText, partialSpeaker, error,
        socketRef, isRecordingRef,
        setIsRecording, setError, handleMessage, baseCleanup, resetState, connectViewer
    } = useBaseAudioStream(wsUrl);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const stopRecording = useCallback(() => {
        // 1. Audio stoppen
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current = null;

        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }

        // 2. Basis Cleanup aufrufen
        baseCleanup();
        resetState();
    }, [baseCleanup, resetState]);

    const startRecording = useCallback(async () => {
        resetState();

        if (!wsUrl) {
            setError("No Session URL");
            return;
        }

        stopRecording(); // Clean start
        isRecordingRef.current = true;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            });
            streamRef.current = stream;

            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                console.log('WS: Connected (Deepgram Host)');
                if (isRecordingRef.current) {
                    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                    mediaRecorderRef.current = mediaRecorder;

                    mediaRecorder.ondataavailable = (event) => {
                        if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
                            socket.send(event.data);
                        }
                    };

                    mediaRecorder.start(250);
                    setIsRecording(true);
                } else {
                    socket.close();
                }
            };

            socket.onmessage = handleMessage;
            socket.onerror = () => { if (isRecordingRef.current) setError('WebSocket connection failed'); };
            socket.onclose = () => { if (isRecordingRef.current) { stopRecording(); setError('Connection closed by server'); } };

        } catch (err) {
            console.error(err);
            setError('Could not access microphone.');
            isRecordingRef.current = false;
            stopRecording();
        }
    }, [wsUrl, stopRecording, handleMessage, setError, setIsRecording, isRecordingRef, socketRef, resetState]);

    return { isRecording, segments, partialText, partialSpeaker, startRecording, stopRecording, connectViewer, error };
};