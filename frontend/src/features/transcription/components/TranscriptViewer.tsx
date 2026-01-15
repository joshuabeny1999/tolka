import { useEffect, useRef, type UIEventHandler } from "react";
import { cn } from "@/lib/utils";
import type {TranscriptSegment} from "@/features/transcription/types";

interface TranscriptViewerProps {
    segments: TranscriptSegment[];
    partialText: string;
    fontSize: number;
    accentColor: string;
    isRecording: boolean;
    autoScroll: boolean;
    setAutoScroll: (enabled: boolean) => void;
}

export function TranscriptViewer({
                                     segments,
                                     partialText,
                                     fontSize,
                                     accentColor,
                                     isRecording,
                                     autoScroll,
                                     setAutoScroll
                                 }: TranscriptViewerProps) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // 1. Automatisches Scrollen (nur wenn enabled)
    useEffect(() => {
        if (autoScroll && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [segments, partialText, autoScroll]);

    // 2. Intelligente Scroll-Erkennung
    const handleScroll: UIEventHandler<HTMLDivElement> = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

        const isAtBottom = scrollHeight - scrollTop - clientHeight <= 50;

        if (!isAtBottom && autoScroll) {
            setAutoScroll(false);
        }

        if (isAtBottom && !autoScroll) {
            setAutoScroll(true);
        }
    };

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-6 scroll-smooth"
        >
            <div className="max-w-3xl mx-auto space-y-2"> {/* space-y-4 macht den Abstand zwischen Absätzen */}

                {/* 1. Historie / Fertige Segmente rendern */}
                {segments.map((seg) => (
                    <div
                        key={seg.id}
                        className="leading-relaxed transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
                        style={{ fontSize: `${fontSize}px` }}
                    >
                        <span className="text-foreground">
                            {seg.text}
                        </span>
                    </div>
                ))}

                {/* 2. Aktiver "Live" Absatz */}
                {(partialText || isRecording) && (
                    <div
                        className="leading-relaxed min-h-[1.5em]"
                        style={{ fontSize: `${fontSize}px` }}
                    >
                        <span className="text-muted-foreground italic">
                            {partialText}
                        </span>

                        {isRecording && (
                            <span className={cn(
                                "inline-block w-2 h-[1em] ml-1 align-middle animate-pulse opacity-50 bg-current",
                                accentColor
                            )}/>
                        )}
                    </div>
                )}

                <div ref={bottomRef} className="h-4" />            </div>
        </div>
    );
}