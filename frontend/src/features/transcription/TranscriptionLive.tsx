import { useState } from "react";
import { useSession } from "./hooks/useSession";
import { useTranscription } from "./hooks/useTranscription";
import { useSpeakerRegistry } from "@/features/transcription/hooks/useSpeakerRegistry";
import { LobbyView } from "./components/LobbyView";
import { ActiveSessionView } from "./components/ActiveSessionView";
import { ActiveSessionFullscreenView } from "./components/ActiveSessionFullscreenView.tsx";
import { Loader2 } from "lucide-react";
import { useWakeLock } from "@/features/transcription/hooks/useWakeLock.ts";

export function TranscriptionLive() {
    const { roomId, role, provider: sessionProvider, isLoading: sessionLoading, createSession, closeSession } = useSession();

    useWakeLock(!!roomId);

    const {
        provider, isRecording, toggleRecording, segments, partialText,
        partialSpeaker, socketRef, error, meta
    } = useTranscription(roomId, role, sessionProvider);

    const [fontSize, setFontSize] = useState(24);
    const [autoScroll, setAutoScroll] = useState(true);
    const [visibleMinimap, setVisibleMinimap] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const registryData = useSpeakerRegistry(socketRef, isRecording);

    if (sessionLoading) {
        return <div className="h-screen w-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
    }

    if (!roomId) {
        return <LobbyView onCreateSession={createSession} />;
    }

    if (isFullscreen) {
        return (
            <ActiveSessionFullscreenView
                segments={segments}
                partialText={partialText}
                partialSpeaker={partialSpeaker}
                meta={meta}
                isRecording={isRecording}
                fontSize={fontSize}
                autoScroll={autoScroll}
                visibleMinimap={visibleMinimap}
                setAutoScroll={setAutoScroll}
                onExitFullscreen={() => setIsFullscreen(false)}
                registryData={registryData}
            />
        );
    }

    return (
        <ActiveSessionView
            roomId={roomId}
            role={role}
            provider={provider}
            isRecording={isRecording}
            toggleRecording={toggleRecording}
            segments={segments}
            partialText={partialText}
            partialSpeaker={partialSpeaker}
            error={error}
            meta={meta}
            onLeave={closeSession}
            toggleFullscreen={() => setIsFullscreen(true)}
            fontSize={fontSize}
            setFontSize={setFontSize}
            visibleMinimap={visibleMinimap}
            setVisibleMinimap={setVisibleMinimap}
            autoScroll={autoScroll}
            setAutoScroll={setAutoScroll}
            registryData={registryData}
        />
    );
}