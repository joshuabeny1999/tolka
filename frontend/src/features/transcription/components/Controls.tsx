import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
    Mic,
    MicOff,
    AArrowUp,
    AArrowDown,
    ArrowDownToLine,
    Radio,
    Map
} from "lucide-react";
import { cn } from "@/lib/utils";
import {HideSpeakersDialog} from "@/features/transcription/components/HideSpeakersDialog.tsx";
import type {TranscriptSegment} from "@/features/transcription/types";

interface ControlsProps {
    fontSize: number;
    setFontSize: (size: number) => void;
    isRecording: boolean;
    onToggleRecording: (val: boolean) => void;
    accentColor: string;
    autoScroll: boolean;
    setAutoScroll: (enabled: boolean) => void;
    showMinimap: boolean;
    setShowMinimap: (enabled: boolean) => void;
    readOnly?: boolean;
    segments: TranscriptSegment[];
    registry: Record<string, { name: string; position: number, hidden: boolean }>;
    updateSpeakerHiddenStatus: (id: string, hidden: boolean) => void;
}

export function Controls({
                             fontSize,
                             setFontSize,
                             isRecording,
                             onToggleRecording,
                             autoScroll,
                             setAutoScroll,
                             showMinimap,
                             setShowMinimap,
                             readOnly = false,
                             segments,
                             registry,
                             updateSpeakerHiddenStatus
                         }: ControlsProps) {

    const adjustFont = (delta: number) => {
        setFontSize(Math.max(14, Math.min(42, fontSize + delta)));
    };

    return (
        <div className="border-t border-border bg-card/90 backdrop-blur p-4 pb-8 md:pb-4">
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">

                {/* Left: Visual Preferences (Available to everyone) */}
                <div className="flex items-center gap-2 order-2 md:order-1">
                    <div className="flex items-center bg-secondary/30 rounded-full p-1 border border-border/50">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => adjustFont(-2)}
                            disabled={fontSize <= 14}
                        >
                            <AArrowDown className="w-4 h-4"/>
                        </Button>
                        <span className="w-10 text-center font-mono text-xs text-muted-foreground select-none">
                            {fontSize}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => adjustFont(2)}
                            disabled={fontSize >= 42}
                        >
                            <AArrowUp className="w-4 h-4"/>
                        </Button>
                    </div>

                    <Button
                        variant={autoScroll ? "secondary" : "ghost"}
                        size="icon"
                        onClick={() => setAutoScroll(!autoScroll)}
                        className={cn("h-10 w-10 rounded-full transition-all", autoScroll && "bg-blue-500/15 text-blue-600")}
                    >
                        <ArrowDownToLine className={cn("w-4 h-4", !autoScroll && "opacity-50")}/>
                    </Button>
                </div>

                {/* Center: Action Button (Host vs Viewer) */}
                <div className="flex items-center gap-3 order-1 md:order-2">
                    {readOnly ? (
                        // VIEWER VIEW
                        <div
                            className="flex items-center gap-3 px-6 py-2 rounded-full border border-border/60 bg-secondary/20">
                            <Radio
                                className={cn("w-4 h-4 animate-pulse", isRecording ? "text-green-500" : "text-muted-foreground")}/>
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {isRecording ? "Receiving Live Audio" : "Waiting for Host"}
                            </span>
                        </div>
                    ) : (
                        // HOST VIEW
                        <div className={cn(
                            "flex items-center gap-3 px-4 py-2 rounded-full border transition-all duration-300",
                            isRecording
                                ? "bg-red-500/5 border-red-200 shadow-[0_0_15px_-3px_rgba(239,68,68,0.2)]"
                                : "bg-background border-border"
                        )}>
                            {isRecording ? (
                                <Mic className="w-5 h-5 text-red-500 animate-pulse"/>
                            ) : (
                                <MicOff className="w-5 h-5 text-muted-foreground"/>
                            )}
                            <div className="flex flex-col">
                                <span
                                    className={cn("text-xs font-bold uppercase tracking-wider", isRecording ? "text-red-600" : "text-muted-foreground")}>
                                    {isRecording ? "On Air" : "Offline"}
                                </span>
                            </div>
                            <Switch
                                checked={isRecording}
                                onCheckedChange={onToggleRecording}
                                className="ml-2 data-[state=checked]:bg-red-500"
                            />
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end min-w-[140px] order-3">
                    <div className="flex items-center gap-2 order-2 md:order-1">
                    <HideSpeakersDialog
                        segments={segments}
                        registry={registry}
                        updateSpeakerHiddenStatus={updateSpeakerHiddenStatus}/>
                    <Button
                        variant={showMinimap ? "secondary" : "ghost"}
                        size="icon"
                        onClick={() => setShowMinimap(!showMinimap)}
                        className={cn(
                            "h-10 w-10 rounded-full transition-all",
                            // Gleiche Farb-Logik wie beim AutoScroll Button (Blau bei Aktiv)
                            showMinimap && "bg-blue-500/15 text-blue-600"
                        )}
                        title="Minimap ein/ausblenden"
                    >
                        <Map className={cn("w-4 h-4", !showMinimap && "opacity-50")}/>
                    </Button>
                </div>
                </div>
            </div>
        </div>
    );
}