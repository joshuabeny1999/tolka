import { TranscriptViewer } from "./TranscriptViewer";
import { Controls } from "./Controls";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import {XCircle, LogOut} from "lucide-react";
import type { ProviderType, TranscriptSegment } from "../types";
import { CalibrationDialog } from "./CalibrationDialog";
import {InviteDialog} from "./InviteDialog";
import {TranscriptMinimap} from "@/features/transcription/components/TranscriptMinimap.tsx";

interface ActiveSessionViewProps {
    roomId: string;
    role: "host" | "viewer" | null;
    provider: ProviderType;
    isRecording: boolean;
    segments: TranscriptSegment[];
    partialText: string;
    partialSpeaker: string | null;
    error: string | null;
    meta: { name: string; color: string };
    toggleRecording: (val: boolean) => void;
    onLeave: () => void;
    toggleFullscreen: () => void;
    fontSize: number;
    setFontSize: (size: number) => void;
    visibleMinimap: boolean;
    setVisibleMinimap: (enabled: boolean) => void;
    autoScroll: boolean;
    setAutoScroll: (enabled: boolean) => void;
    registryData: any;
}


export function ActiveSessionView({
                                      role,
                                      provider,
                                      isRecording,
                                      segments,
                                      partialText,
                                      partialSpeaker,
                                      error,
                                      meta,
                                      toggleRecording,
                                      onLeave,
                                      toggleFullscreen,
                                      fontSize,
                                      setFontSize,
                                      visibleMinimap,
                                      setVisibleMinimap,
                                      autoScroll,
                                      setAutoScroll,
                                      registryData
                                  }: ActiveSessionViewProps) {
    const {
        registry, updateSpeaker, updateSpeakerHiddenStatus, calibrateView,
        getName, getHidden, getDirection, getRotationOffset,
    } = registryData;

    return (
        <div className="flex flex-col h-full relative bg-background">
            <header
                className="flex items-center justify-between px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div
                        className={`w-2.5 h-2.5 rounded-full transition-colors ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}/>
                    <h2 className="font-bold tracking-tight hidden sm:block">Tolka Live</h2>

                    <Button
                        variant={role === 'host' ? "destructive" : "ghost"}
                        size="sm"
                        onClick={onLeave}
                        className="gap-2 h-8 px-3"
                    >
                        {role === 'host' ? (
                            <>
                                <XCircle className="w-3.5 h-3.5"/>
                                <span className="hidden sm:inline text-xs font-medium">Beenden</span>
                            </>
                        ) : (
                            <>
                                <LogOut className="w-3.5 h-3.5"/>
                                <span className="hidden sm:inline text-xs font-medium">Verlassen</span>
                            </>
                        )}
                    </Button>

                    <div className="flex items-center gap-2">
                        <CalibrationDialog
                            role={role || 'viewer'}
                            segments={segments}
                            registry={registry}
                            updateSpeaker={updateSpeaker}
                            calibrateView={calibrateView}
                        />

                        {/* Invite Dialog - Verbessertes UI */}
                        {role === 'host' && (
                            <InviteDialog />
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {role === 'viewer' && (
                        <span
                            className="hidden xs:inline-flex items-center px-2 py-1 rounded bg-secondary text-[10px] font-medium uppercase tracking-wide text-secondary-foreground">
                            Zuhörer
                        </span>
                    )}
                    <StatusBadge provider={provider} error={error}/>
                </div>
            </header>

            {/* Main Content */}
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
            />
            <TranscriptMinimap
                registry={registry}
                currentSpeakerId={partialSpeaker} // Nutze partialSpeaker für Live-Effekt
                getRotationOffset={getRotationOffset}
                visible={visibleMinimap}
            />

            {/* Controls */}
            <Controls
                fontSize={fontSize}
                setFontSize={setFontSize}
                isRecording={isRecording}
                onToggleRecording={toggleRecording}
                accentColor={meta.color}
                autoScroll={autoScroll}
                setAutoScroll={setAutoScroll}
                showMinimap={visibleMinimap}
                setShowMinimap={setVisibleMinimap}
                toggleFullscreen={toggleFullscreen}
                readOnly={role === 'viewer'}
                segments={segments}
                registry={registry}
                updateSpeakerHiddenStatus={updateSpeakerHiddenStatus}
            />
        </div>
    );
}