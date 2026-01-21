import { useRef, useCallback } from 'react';
import type { UseAudioStreamReturn } from '../types';
import { useBaseAudioStream } from './useBaseAudioStream';

// --- Static Helpers ---
const downsampleBuffer = (buffer: Float32Array, inputSampleRate: number, targetSampleRate: number) => {
    if (inputSampleRate === targetSampleRate) return buffer;
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

export const useAudioStreamAzure = (wsUrl: string): UseAudioStreamReturn => {
    const {
        isRecording, segments, partialText, partialSpeaker, error,
        socketRef, isRecordingRef,
        setIsRecording, setError, handleMessage, baseCleanup, resetState, connectViewer
    } = useBaseAudioStream(wsUrl);

    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const stopRecording = useCallback(() => {
        // 1. Audio Cleanup
        if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
        if (sourceRef.current) sourceRef.current.disconnect();
        if (processorRef.current) processorRef.current.disconnect();
        if (audioContextRef.current) audioContextRef.current.close();

        streamRef.current = null;
        sourceRef.current = null;
        processorRef.current = null;
        audioContextRef.current = null;

        // 2. Base Cleanup
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

            socket.onopen = async () => {
                console.log('WS: Connected (Azure Host)');
                if (!isRecordingRef.current) { socket.close(); return; }

                try {
                    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
                    audioContextRef.current = context;

                    const stream = await navigator.mediaDevices.getUserMedia({
                        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }
                    });
                    streamRef.current = stream;

                    const source = context.createMediaStreamSource(stream);
                    sourceRef.current = source;
                    // Deprecated but required for raw PCM manipulation in some contexts without AudioWorklet complexity
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
                    stopRecording();
                }
            };

            socket.onmessage = handleMessage;
            socket.onerror = () => { if (isRecordingRef.current) setError('WebSocket Error'); };
            socket.onclose = () => { if (isRecordingRef.current) stopRecording(); };

        } catch (err) {
            console.error(err);
            setError('Connection Error');
            isRecordingRef.current = false;
        }
    }, [wsUrl, stopRecording, handleMessage, setError, setIsRecording, isRecordingRef, socketRef, resetState]);

    return { isRecording, segments, partialText, partialSpeaker, startRecording, stopRecording, connectViewer, socketRef, error };
};