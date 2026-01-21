import { useState } from "react";
import QRCode from "react-qr-code";
import { TranscriptViewer } from "./TranscriptViewer";
import { Controls } from "./Controls";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import {Copy, Check, Users, XCircle, LogOut} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ProviderType, TranscriptSegment } from "../types";
import {Label} from "@radix-ui/react-dropdown-menu";
import { useSpeakerRegistry } from "@/features/transcription/hooks/useSpeakerRegistry";
import { CalibrationDialog } from "./CalibrationDialog";

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
    socketRef: React.RefObject<WebSocket | null>;
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
                                      socketRef
                                  }: ActiveSessionViewProps) {
    const [fontSize, setFontSize] = useState(24);
    const [autoScroll, setAutoScroll] = useState(true);
    const [copied, setCopied] = useState(false);

    // URL für den Share-Dialog
    const getShareUrl = () => {
        const url = new URL(window.location.href);
        url.searchParams.delete('role'); // Viewer darf kein Host sein
        return url.toString();
    };
    const shareUrl = getShareUrl();

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const {
        registry,
        updateSpeaker,
        calibrateView,
        getName,
        getDirection
    } = useSpeakerRegistry(socketRef,isRecording);

    return (
        <div className="flex flex-col h-full relative bg-background">
            <header className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full transition-colors ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                    <h2 className="font-bold tracking-tight hidden sm:block">Tolka Live</h2>

                    <Button
                        variant={role === 'host' ? "destructive" : "ghost"}
                        size="sm"
                        onClick={onLeave}
                        className="gap-2 h-8 px-3"
                    >
                        {role === 'host' ? (
                            <>
                                <XCircle className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline text-xs font-medium">Beenden</span>
                            </>
                        ) : (
                            <>
                                <LogOut className="w-3.5 h-3.5" />
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
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="secondary" size="sm" className="gap-2 ml-2 h-8 px-3">
                                    <Users className="w-3.5 h-3.5" />
                                    <span className="text-xs font-medium">Einladen</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-sm">
                                <DialogHeader>
                                    <DialogTitle>Teilnehmer einladen</DialogTitle>
                                    <DialogDescription>
                                        Lassen Sie andere diesen Code scannen, um der Sitzung beizutreten.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="flex flex-col items-center gap-6 py-6">
                                    {/* Weißer Hintergrund für Kontrast */}
                                    <div className="p-4 bg-white rounded-xl shadow-sm border border-border/50">
                                        <QRCode
                                            value={shareUrl}
                                            size={180}
                                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                            viewBox={`0 0 256 256`}
                                        />
                                    </div>

                                    <div className="w-full space-y-2">
                                        <Label className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                                            Sitzungs-Link
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                readOnly
                                                value={shareUrl}
                                                className="font-mono text-xs bg-secondary/50 h-9"
                                            />
                                            <Button size="icon" variant="outline" onClick={copyToClipboard} className="h-9 w-9 shrink-0">
                                                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {role === 'viewer' && (
                        <span className="hidden xs:inline-flex items-center px-2 py-1 rounded bg-secondary text-[10px] font-medium uppercase tracking-wide text-secondary-foreground">
                            Zuhörer
                        </span>
                    )}
                    <StatusBadge provider={provider} error={error} />
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
                getDirection={getDirection}
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
                readOnly={role === 'viewer'}
            />
        </div>
    );
}