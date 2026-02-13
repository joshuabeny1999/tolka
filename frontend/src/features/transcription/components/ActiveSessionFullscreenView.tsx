import { Button } from "@/components/ui/button";
import {AArrowDown, AArrowUp, ArrowDownToLine, Minimize} from "lucide-react";
import { cn } from "@/lib/utils";
import { TranscriptViewer } from "./TranscriptViewer";
import { TranscriptMinimap } from "@/features/transcription/components/TranscriptMinimap";
import type { TranscriptSegment } from "../types";

interface FullscreenProps {
    segments: TranscriptSegment[];
    partialText: string;
    partialSpeaker: string | null;
    meta: { name: string; color: string };
    isRecording: boolean;
    fontSize: number;
    setFontSize: (size: number) => void;
    visibleMinimap: boolean;
    autoScroll: boolean;
    setAutoScroll: (val: boolean) => void;
    onExitFullscreen: () => void;
    registryData: any;
}

export function ActiveSessionFullscreenView({
                                                segments, partialText, partialSpeaker, meta, isRecording,
                                                fontSize, setFontSize, visibleMinimap, autoScroll, setAutoScroll, onExitFullscreen,
                                                registryData
                                            }: FullscreenProps) {

    const {
        registry, getName, getHidden, getDirection, getRotationOffset
    } = registryData;

    const adjustFont = (delta: number) => {
        setFontSize(Math.max(14, Math.min(42, fontSize + delta)));
    };
    return (
        <div className="flex flex-col h-full relative bg-background animate-in fade-in duration-300">

            {/* VIEWER */}
            <TranscriptViewer
                segments={segments}
                partialText={partialText}
                partialSpeaker={partialSpeaker}
                fontSize={fontSize}
                accentColor={meta.color}
                isRecording={isRecording}
                autoScroll={autoScroll}
                setAutoScroll={setAutoScroll}
                getName={getName}
                getHidden={getHidden}
                getDirection={getDirection}
                className="pb-15"
            />

            <TranscriptMinimap
                    registry={registry}
                    currentSpeakerId={partialSpeaker}
                    getRotationOffset={getRotationOffset}
                    visible={visibleMinimap}
                    className="top-4"
            />

            {/* DOCK / BOTTOM BAR - Kleiner & Kompakter */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-1 rounded-full bg-background/80 backdrop-blur-md border shadow-xl animate-in slide-in-from-bottom-4">


                <div className="flex items-center  rounded-full p-1  ">
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
                <div className="w-px h-4 bg-border/50 mx-1" />

                <Button
                    variant={autoScroll ? "default" : "ghost"}
                    size="icon"
                    onClick={() => setAutoScroll(!autoScroll)}
                    className={cn(
                        "h-8 w-8 rounded-full transition-all", // Kleiner (h-8 statt h-10)
                        autoScroll ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm" : "text-muted-foreground hover:bg-muted"
                    )}
                    title="Autoscroll"
                >
                    <ArrowDownToLine className={cn("w-4 h-4", !autoScroll && "opacity-50")} /> {/* Icon kleiner */}
                </Button>


                <div className="w-px h-4 bg-border/50 mx-1" />

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onExitFullscreen}
                    className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                    title="Verlassen"
                >
                    <Minimize className="w-4 h-4" /> {/* Icon kleiner */}
                </Button>
            </div>
        </div>
    );
}