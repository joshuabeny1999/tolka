import { useState, useRef, useCallback, useEffect } from 'react';
import type {TranscriptSegment, UseAudioStreamReturn} from '../types';

export const useAudioStreamMock = (wsUrl: string): UseAudioStreamReturn => {
    const [isRecording, setIsRecording] = useState(false);
    const [segments, setSegments] = useState<TranscriptSegment[]>([]);    const [partialText, setPartialText] = useState('');
    const [error, setError] = useState<string | null>(null);

    const socketRef = useRef<WebSocket | null>(null);
    // Ref for the interval that simulates the data stream
    const simulationIntervalRef = useRef<number | null>(null);

    const isRecordingRef = useRef(false);

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

    const stopRecording = useCallback(() => {
        isRecordingRef.current = false;

        // Clear the simulation interval
        if (simulationIntervalRef.current) {
            window.clearInterval(simulationIntervalRef.current);
            simulationIntervalRef.current = null;
        }

        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
        setIsRecording(false);
        setPartialText('');
    }, []);

    useEffect(() => {
        return () => {
            if (isRecordingRef.current) stopRecording();
        };
    }, [stopRecording]);

    const startRecording = useCallback(async () => {
        setError(null);
        isRecordingRef.current = true;

        try {
            // Removed getUserMedia call

            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                console.log('WebSocket connected (Mock Mode)');
                if (isRecordingRef.current) {
                    setIsRecording(true);

                    simulationIntervalRef.current = window.setInterval(() => {
                        if (socket.readyState === WebSocket.OPEN) {
                            // Create a dummy payload (e.g., 4KB of random noise)
                            const dummySize = 4096;
                            const dummyData = new Uint8Array(dummySize);
                            for (let i = 0; i < dummySize; i++) { dummyData[i] = Math.floor(Math.random() * 255); }

                            socket.send(dummyData);
                        }
                    }, 250);
                }
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (!data.text) return;

                    if (data.is_partial) {
                        setPartialText(data.text);
                    } else {
                        handleFinalResult(data.text);
                    }
                } catch (err) {
                    console.error('JSON Error:', err);
                }
            };

            socket.onerror = () => {
                if (isRecordingRef.current) setError('WebSocket connection failed');
            };

            socket.onclose = () => {
                if (isRecordingRef.current) {
                    stopRecording();
                    setError('Connection closed by server');
                }
            };

            // No MediaRecorder setup needed here

        } catch (err) {
            console.error(err);
            setError('Mock initialization failed.');
            isRecordingRef.current = false;
        }
    }, [wsUrl]); // stopRecording is handled via ref/logic, technically strict dependency isn't needed here if logic is stable

    return {
        isRecording,
        segments,
        partialText,
        startRecording,
        stopRecording,
        error,
    };
};