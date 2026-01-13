import { useState, useRef, useCallback, useEffect } from 'react'; // useEffect fehlte im Import
import type {TranscriptSegment, UseAudioStreamReturn} from '../types';


export const useAudioStreamDeepgram = (wsUrl: string): UseAudioStreamReturn => {
    const [isRecording, setIsRecording] = useState(false);
    const [segments, setSegments] = useState<TranscriptSegment[]>([]);
    const [partialText, setPartialText] = useState('');
    const [error, setError] = useState<string | null>(null);

    const socketRef = useRef<WebSocket | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

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

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
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
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                console.log('WebSocket connected');
                if (isRecordingRef.current && mediaRecorderRef.current?.state === 'inactive') {
                    mediaRecorderRef.current.start(250);
                    setIsRecording(true);
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
        }
    }, [wsUrl]); // stopRecording ist stabil dank useCallback, muss hier nicht in dependency array


    return {
        isRecording,
        segments,
        partialText,
        startRecording,
        stopRecording,
        error,
    };
};