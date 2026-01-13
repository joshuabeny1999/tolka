import { useState } from "react";
import { useTranscription } from "./hooks/useTranscription";
import { TranscriptViewer } from "./components/TranscriptViewer";
import { Controls } from "./components/Controls";
import { StatusBadge } from "./components/StatusBadge";

export function TranscriptionLive() {
    // Local UI state (formatting preferences)
    const [fontSize, setFontSize] = useState(24);
    const [autoScroll, setAutoScroll] = useState(true);

    // Feature Logic (API connection, streams)
    const {
        provider,
        setProvider,
        isRecording,
        toggleRecording,
        segments,
        partialText,
        error,
        meta
    } = useTranscription();

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b border-border bg-card/50">
                <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full transition-colors ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                    <h2 className="font-bold tracking-tight">Tolka Live</h2>
                </div>
                <StatusBadge provider={provider} error={error} />
            </header>

            {/* Main Viewer */}
            <TranscriptViewer
                segments={segments}
                partialText={partialText}
                fontSize={fontSize}
                accentColor={meta.color}
                isRecording={isRecording}
                autoScroll={autoScroll}
                setAutoScroll={setAutoScroll}
                />

            {/* Footer Controls */}
            <Controls
                fontSize={fontSize}
                setFontSize={setFontSize}
                isRecording={isRecording}
                onToggleRecording={toggleRecording}
                engineName={meta.name}
                accentColor={meta.color}
                provider={provider}
                setProvider={setProvider}
                autoScroll={autoScroll}
                setAutoScroll={setAutoScroll}
            />
        </div>
    );
}