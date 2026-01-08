import { useState, useRef, useCallback } from 'react';

interface UseAudioStreamReturn {
    isRecording: boolean;
    committedText: string; // Der fertige Text
    partialText: string;   // Der "flackernde" Live-Text
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    error: string | null;
}

export const useAudioStream = (wsUrl: string): UseAudioStreamReturn => {
    const [isRecording, setIsRecording] = useState(false);
    const [committedText, setCommittedText] = useState('');
    const [partialText, setPartialText] = useState('');
    const [error, setError] = useState<string | null>(null);

    const socketRef = useRef<WebSocket | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    const startRecording = useCallback(async () => {
        setError(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => console.log('WebSocket connected');

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    // Logic for handling partial vs final results
                    if (data.is_partial) {
                        // Partial: Overwrite the current temporary text buffer
                        setPartialText(data.text);
                    } else {
                        // Final: Append to the committed text history and clear partial buffer
                        // We add a space if there is already text
                        setCommittedText((prev) => {
                            const newText = prev ? `${prev} ${data.text}` : data.text;
                            return newText;
                        });
                        setPartialText(''); // Clear partial as it is now committed
                    }

                } catch (err) {
                    console.error('Error parsing JSON:', err);
                }
            };

            socket.onerror = () => setError('WebSocket connection failed');

            // ... Rest of MediaRecorder setup remains the same ...
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
                    socket.send(event.data);
                }
            };

            mediaRecorder.start(75);
            setIsRecording(true);

        } catch (err) {
            console.error(err);
            setError('Could not access microphone.');
        }
    }, [wsUrl]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
        }
        if (socketRef.current) {
            socketRef.current.close();
        }
        setIsRecording(false);
        // Optional: Reset text on stop? Or keep it? keeping it for now.
    }, []);

    return {
        isRecording,
        committedText,
        partialText,
        startRecording,
        stopRecording,
        error,
    };
};