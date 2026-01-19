export type ProviderType = 'azure' | 'deepgram' | 'mock';


export interface TranscriptSegment {
    id: string;
    text: string;
    speaker: string;
    timestamp: number;
    isFinal: boolean;
}

export interface UseAudioStreamReturn {
    isRecording: boolean;
    segments: TranscriptSegment[];
    partialSpeaker: string | null;
    partialText: string;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    connectViewer: () => void;
    error: string | null;
}