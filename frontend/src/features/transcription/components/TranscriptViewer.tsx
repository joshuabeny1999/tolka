import { useEffect, useRef, type UIEventHandler } from "react";
import { cn } from "@/lib/utils";
import type { TranscriptSegment } from "@/features/transcription/types";
import { getSpeakerColor } from "@/features/transcription/utils/speakerColors";
import { ArrowUp } from "lucide-react";

interface TranscriptViewerProps {
    segments: TranscriptSegment[];
    partialText: string;
    partialSpeaker?: string | null;
    fontSize: number;
    accentColor: string; // Wird jetzt als Fallback genutzt
    isRecording: boolean;
    autoScroll: boolean;
    setAutoScroll: (enabled: boolean) => void;
    getName: (id: string) => string;
    getHidden: (id: string) => boolean;
    getDirection: (id: string) => number | null;
}

export function TranscriptViewer({
                                     segments,
                                     partialText,
                                     partialSpeaker,
                                     fontSize,
                                     accentColor,
                                     isRecording,
                                     autoScroll,
                                     setAutoScroll,
                                     getName,
                                     getHidden,
                                     getDirection
                                 }: TranscriptViewerProps) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (autoScroll && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [segments, partialText, autoScroll]);

    const handleScroll: UIEventHandler<HTMLDivElement> = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        const isAtBottom = scrollHeight - scrollTop - clientHeight <= 50;
        if (!isAtBottom && autoScroll) setAutoScroll(false);
        if (isAtBottom && !autoScroll) setAutoScroll(true);
    };

    const renderSegment = (text: string, speakerID: string | null, isPartial = false) => {
        if (!text && !isPartial) return null;

        const hidden = speakerID ? getHidden(speakerID) : false;
        if (hidden && !isPartial) return null;

        const speakerName = speakerID ? getName(speakerID) : "Unknown";
        const direction = speakerID ? getDirection(speakerID) : null;
        const hasSpecificSpeaker = speakerID && speakerID !== "Unknown";
        const colorClass = hasSpecificSpeaker ? getSpeakerColor(speakerID) : accentColor;
        const rotationStyle = direction !== null ? { transform: `rotate(${direction}deg)` } : {};

        return (
            <div className={cn("flex flex-col mb-4", isPartial && "opacity-80")} style={{ fontSize: `${fontSize}px` }}>

                {/* HEADER: Identisch zum normalen UI (Name & Pfeil) */}
                {(direction !== null || hasSpecificSpeaker) && (
                    <div className="flex items-center gap-2 mb-1 opacity-60 select-none">
                        {direction !== null && (
                            <ArrowUp
                                className={cn("w-[0.8em] h-[0.8em] transition-transform duration-500", colorClass)}
                                style={rotationStyle}
                                strokeWidth={3}
                            />
                        )}
                        {hasSpecificSpeaker && (
                            <span className={cn("text-[0.6em] font-bold uppercase tracking-wider leading-none", colorClass)}>
                                {speakerName}
                            </span>
                        )}
                    </div>
                )}

                <div className={cn("font-medium leading-relaxed", colorClass)}>

                    {hidden ? (
                        <div className="flex items-center gap-2 py-1 animate-pulse opacity-70">
                            <span className="ml-2 text-[0.8em] italic opacity-80">
                                spricht...
                            </span>
                        </div>
                    ) : (
                        <>
                            {text}
                            {isPartial && isRecording && (
                                <span className="inline-block w-2 h-[0.8em] ml-1 align-middle animate-pulse opacity-50 bg-current"/>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth bg-background"
        >
            <div className="max-w-3xl mx-auto space-y-6">

                {segments
                    .filter(seg => !getHidden(seg.speaker))
                    .map((seg) => (
                        <div key={seg.id} className="animate-in fade-in slide-in-from-bottom-1">
                            {renderSegment(seg.text, seg.speaker)}
                        </div>
                    ))}

                {/* Live/Partial Bereich */}
                {(partialText || isRecording) && (
                    <div className="animate-in fade-in">
                        {renderSegment(partialText, partialSpeaker ?? null, true)}
                    </div>
                )}
                <div ref={bottomRef} className="h-4" />
            </div>
        </div>
    );
            }