import type {RefObject} from "react";

export type ProviderType = 'azure' | 'deepgram' | 'mock';

export interface TranscriptSegment {
    id: string;
    text: string;
    speaker: string;
    timestamp: number;
    isFinal: boolean;
}

export interface SpeakerData {
    name: string;
    position: number; // 0-360 Grad. 180 = Below (Host Position)
    hidden: boolean;
}

// NEU: Datenstruktur für Speaker im Backend/Frontend Sync
export interface SpeakerData {
    name: string;
    position: number; // 0-360 Grad. 180 = Unten (Host Position)
}

export interface UseAudioStreamReturn {
    isRecording: boolean;
    segments: TranscriptSegment[];
    partialSpeaker: string | null;
    partialText: string;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    connectViewer: () => void;
    socketRef: RefObject<WebSocket | null>;
    error: string | null;
}