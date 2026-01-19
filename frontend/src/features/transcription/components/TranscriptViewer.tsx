import { useEffect, useRef, type UIEventHandler } from "react";
import { cn } from "@/lib/utils";
import type { TranscriptSegment } from "@/features/transcription/types";
import {getSpeakerColor} from "@/features/transcription/utils/speakerColors";

interface TranscriptViewerProps {
    segments: TranscriptSegment[];
    partialText: string;
    partialSpeaker?: string | null;
    fontSize: number;
    accentColor: string;
    isRecording: boolean;
    autoScroll: boolean;
    setAutoScroll: (enabled: boolean) => void;
}

export function TranscriptViewer({
                                     segments,
                                     partialText,
                                     partialSpeaker,
                                     fontSize,
                                     accentColor,
                                     isRecording,
                                     autoScroll,
                                     setAutoScroll
                                 }: TranscriptViewerProps) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // 1. Automatisches Scrollen
    useEffect(() => {
        if (autoScroll && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [segments, partialText, autoScroll]);

    // 2. Scroll-Erkennung
    const handleScroll: UIEventHandler<HTMLDivElement> = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        const isAtBottom = scrollHeight - scrollTop - clientHeight <= 50;

        if (!isAtBottom && autoScroll) setAutoScroll(false);
        if (isAtBottom && !autoScroll) setAutoScroll(true);
    };

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-6 scroll-smooth bg-background"
        >
            <div className="max-w-3xl mx-auto space-y-4"> {/* Etwas mehr Abstand für bessere Lesbarkeit */}

                {segments.map((seg) => {
                    const colorClass = getSpeakerColor(seg.speaker);
                    const showSpeakerName = seg.speaker && seg.speaker !== "Unknown";

                    return (
                        <div
                            key={seg.id}
                            className="leading-relaxed transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 flex flex-col"
                            style={{ fontSize: `${fontSize}px` }}
                        >
                            {/* Sprecher-Name (klein darüber, falls vorhanden) */}
                            {showSpeakerName && (
                                <span className={cn("text-[0.6em] font-bold uppercase tracking-wider opacity-80 mb-0.5", colorClass)}>
                                    {seg.speaker}
                                </span>
                            )}

                            {/* Der Text selbst in der Sprecher-Farbe */}
                            <span className={cn("font-medium", colorClass)}>
                                {seg.text}
                            </span>
                        </div>
                    );
                })}

                {/* 2. Aktiver "Live" Absatz (Grau/Neutral halten für Stabilität) */}
                {(partialText || isRecording) && (
                    <div
                        className="leading-relaxed min-h-[1.5em] flex flex-col"
                        style={{ fontSize: `${fontSize}px` }}
                    >
                        {partialSpeaker && partialSpeaker !== "Unknown" && (
                            <span className={cn(
                                "text-[0.6em] font-bold uppercase tracking-wider opacity-50 mb-0.5",
                                getSpeakerColor(partialSpeaker)
                            )}>
                                {partialSpeaker}...
                            </span>
                        )}

                        <div className="text-muted-foreground italic">
                            {partialText}
                            {isRecording && (
                                <span className={cn(
                                    "inline-block w-2 h-[1em] ml-1 align-middle animate-pulse opacity-50 bg-current",
                                    accentColor
                                )}/>
                            )}
                        </div>
                    </div>
                )}

                <div ref={bottomRef} className="h-4" />
            </div>
        </div>
    );
}