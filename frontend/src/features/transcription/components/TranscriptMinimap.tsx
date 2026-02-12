import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { getSpeakerColor } from "@/features/transcription/utils/speakerColors";

interface TranscriptMinimapProps {
    registry: Record<string, { name: string; position: number; hidden?: boolean }>;
    currentSpeakerId?: string | null;
    getRotationOffset: () => number;
    visible: boolean;
    className?: string;
}

export function TranscriptMinimap({ registry, currentSpeakerId, getRotationOffset, visible, className }: TranscriptMinimapProps) {
    const viewRotation = getRotationOffset();

    const visibleSpeakers = useMemo(() => {
        if (!registry) return [];
        return Object.entries(registry)
            .filter(([_, data]) => !data.hidden)
            .map(([id, data]) => ({ id, ...data }));
    }, [registry]);

    return (
        // Container ist immer da, aber blendet Inhalt aus
        <div className={cn(
            "fixed top-20 right-5 z-40 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-top-right",
            visible
                ? "opacity-100 scale-100 translate-y-0"
                : "opacity-0 scale-50 -translate-y-4 pointer-events-none",
            className
        )}>
            {/* DER KREIS */}
            <div className="relative w-16 h-16 rounded-full bg-background/90 backdrop-blur-md border shadow-lg flex items-center justify-center overflow-hidden">

                {/* Empty State */}
                {visibleSpeakers.length === 0 && (
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-pulse" />
                )}

                {/* SPRECHER PUNKTE */}
                {visibleSpeakers.map((speaker) => {
                    const isSpeaking = currentSpeakerId === speaker.id;
                    const displayAngle = speaker.position + viewRotation;
                    const colorClass = getSpeakerColor(speaker.id);

                    return (
                        <div
                            key={speaker.id}
                            className="absolute inset-0 flex justify-center pt-1 transition-transform duration-500 ease-out"
                            style={{ transform: `rotate(${displayAngle}deg)` }}
                        >
                            <div className="relative w-4 h-4 flex items-center justify-center">
                                {/* Pulsieren */}
                                {isSpeaking && (
                                    <span className={cn(
                                        "absolute inset-0 rounded-full animate-ping opacity-75",
                                        colorClass, "bg-current"
                                    )} />
                                )}

                                {/* Punkt */}
                                <div
                                    className={cn(
                                        "rounded-full shadow-sm z-10 transition-all duration-200",
                                        colorClass,
                                        "bg-current",
                                        isSpeaking
                                            ? "w-3 h-3 ring-2 ring-background"
                                            : "w-2.5 h-2.5 opacity-90"
                                    )}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}