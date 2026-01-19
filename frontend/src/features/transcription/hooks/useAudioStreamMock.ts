import { useRef, useCallback } from 'react';
import type { UseAudioStreamReturn } from '../types';
import { useBaseAudioStream } from './useBaseAudioStream';

export const useAudioStreamMock = (wsUrl: string): UseAudioStreamReturn => {
    const {
        isRecording, segments, partialText, partialSpeaker, error,
        socketRef, isRecordingRef,
        setIsRecording, setError, handleMessage, baseCleanup, resetState, connectViewer
    } = useBaseAudioStream(wsUrl);

    const simulationIntervalRef = useRef<number | null>(null);

    const stopRecording = useCallback(() => {
        if (simulationIntervalRef.current) {
            window.clearInterval(simulationIntervalRef.current);
            simulationIntervalRef.current = null;
        }
        baseCleanup();
        resetState();
    }, [baseCleanup, resetState]);

    const startRecording = useCallback(async () => {
        resetState();
        if (!wsUrl) { setError("No Session URL"); return; }

        stopRecording();
        isRecordingRef.current = true;

        try {
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                console.log('WS: Connected (Mock Host)');
                if (isRecordingRef.current) {
                    setIsRecording(true);
                    // Simulation Loop
                    simulationIntervalRef.current = window.setInterval(() => {
                        if (socket.readyState === WebSocket.OPEN) {
                            const dummySize = 4096;
                            const dummyData = new Uint8Array(dummySize);
                            for (let i = 0; i < dummySize; i++) { dummyData[i] = Math.floor(Math.random() * 255); }
                            socket.send(dummyData);
                        }
                    }, 250);
                } else {
                    socket.close();
                }
            };

            socket.onmessage = handleMessage;
            socket.onerror = () => { if (isRecordingRef.current) setError('WebSocket connection failed'); };
            socket.onclose = () => { if (isRecordingRef.current) { stopRecording(); setError('Connection closed by server'); } };

        } catch (err) {
            console.error(err);
            setError('Mock initialization failed.');
            isRecordingRef.current = false;
            stopRecording();
        }
    }, [wsUrl, stopRecording, handleMessage, setError, setIsRecording, isRecordingRef, socketRef, resetState]);

    return { isRecording, segments, partialText, partialSpeaker, startRecording, stopRecording, connectViewer, error };
};