import { useSession } from "./hooks/useSession";
import { useTranscription } from "./hooks/useTranscription";
import { LobbyView } from "./components/LobbyView";
import { ActiveSessionView } from "./components/ActiveSessionView";
import { Loader2 } from "lucide-react";

export function TranscriptionLive() {
    const { roomId, role, provider: sessionProvider, isLoading: sessionLoading, createSession } = useSession();

    // Hooks werden hier initialisiert, aber ActiveSessionView bekommt nur die Daten
    const {
        provider,
        setProvider,
        isRecording,
        toggleRecording,
        segments,
        partialText,
        error,
        meta
    } = useTranscription(roomId, role, sessionProvider);

    // 1. Global Loading State
    if (sessionLoading) {
        return <div className="h-screen w-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
    }

    // 2. Lobby (Noch kein Raum)
    if (!roomId) {
        return <LobbyView onCreateSession={createSession} />;
    }

    // 3. Active Session
    return (
        <ActiveSessionView
            roomId={roomId}
            role={role}
            provider={provider}
            setProvider={setProvider}
            isRecording={isRecording}
            toggleRecording={toggleRecording}
            segments={segments}
            partialText={partialText}
            error={error}
            meta={meta}
        />
    );
}