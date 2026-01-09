import { useState, useRef, useCallback, useEffect } from 'react';

interface UseAudioStreamReturn {
    isRecording: boolean;
    committedText: string;
    partialText: string;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    error: string | null;
}

export const useAudioStreamAzure = (wsUrl: string): UseAudioStreamReturn => {
    const [isRecording, setIsRecording] = useState(false);
    const [committedText, setCommittedText] = useState('');
    const [partialText, setPartialText] = useState('');
    const [error, setError] = useState<string | null>(null);

    const socketRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const isRecordingRef = useRef(false);

    // 1. Hilfsfunktion: Downsampling (z.B. 48kHz -> 16kHz)
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
            // Einfacher Durchschnitt für besseres Audio als nur "Weglassen"
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

    // 2. Hilfsfunktion: Float32 zu Int16 (Azure Format)
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

    // Diese Funktion muss innerhalb von startRecording oder als useCallback definiert sein,
    // um Scope-Probleme zu vermeiden. Ich ziehe sie hier rein.
    const startRecording = useCallback(async () => {
        setError(null);
        isRecordingRef.current = true;

        try {
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            // Audio-Logik kapseln
            const initAudio = async () => {
                // WICHTIG: Keine SampleRate erzwingen! Das verursacht den Fehler.
                // Wir nehmen, was der Browser uns gibt (meist 44.1k oder 48k).
                const context = new (window.AudioContext || (window as any).webkitAudioContext)();
                audioContextRef.current = context;

                // Auch beim Mikrofon keine Rate erzwingen
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

                        // A) Erst Downsamplen (z.B. 48000 -> 16000)
                        const downsampledData = downsampleBuffer(inputData, context.sampleRate, 16000);

                        // B) Dann zu Int16 konvertieren
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
                    console.error("Audio Init Fehler:", audioErr);
                    setError('Mikrofon konnte nicht gestartet werden (AudioContext).');
                    stopRecording();
                }
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (!data.text) return;

                    if (data.is_partial) {
                        setPartialText(data.text);
                    } else {
                        setCommittedText((prev) => (prev ? `${prev} ${data.text}` : data.text));
                        setPartialText('');
                    }
                } catch (e) {
                    console.error('JSON Parse Error', e);
                }
            };

            socket.onerror = () => {
                if (isRecordingRef.current) setError('WebSocket Fehler');
            };

            socket.onclose = () => {
                if (isRecordingRef.current) stopRecording();
            };

        } catch (err) {
            console.error(err);
            setError('Verbindungsfehler');
            isRecordingRef.current = false;
        }
    }, [wsUrl, stopRecording]); // stopRecording als Dependency wichtig

    useEffect(() => {
        return () => {
            if (isRecordingRef.current) stopRecording();
        };
    }, [stopRecording]);

    return {
        isRecording,
        committedText,
        partialText,
        startRecording,
        stopRecording,
        error,
    };
};