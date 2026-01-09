import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Settings, Type, Mic, MicOff, AlertCircle } from "lucide-react"

// Importiere den Hook (Pfad ggf. anpassen)
import { useAudioStream } from "./hooks/useAudioStream"

declare global {
    interface Window {
        TOLKA_CONFIG?: {
            WS_TOKEN: string;
        };
    }
}

function App() {
    // 1. Setup Logic
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = window.TOLKA_CONFIG?.WS_TOKEN || "";
    const wsUrl = `${protocol}//${window.location.hostname}:${window.location.port}/ws?token=${token}`;

    const {
        isRecording,
        committedText,
        partialText,
        startRecording,
        stopRecording,
        error
    } = useAudioStream(wsUrl);

    // 2. UI State
    const [fontSize, setFontSize] = useState([18])

    // Handler für den Switch
    const handleMicToggle = (checked: boolean) => {
        if (checked) {
            startRecording();
        } else {
            stopRecording();
        }
    };

    // Dummy-Daten für die UI Preview (bleiben bestehen, damit es nicht leer aussieht)
    const staticTranscripts = [
        { id: 1, speaker: "System", text: "Bereit für Live-Transkription...", color: "text-zinc-500 italic" },
    ]

    return (
        <div className="flex flex-col h-screen bg-background text-foreground">

            {/* 1. Header Area */}
            <header className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    {/* Status Indikator: Blinkt rot bei Aufnahme, sonst grün/grau */}
                    <div className={`w-3 h-3 rounded-full transition-colors duration-300 ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                    <h1 className="text-xl font-bold tracking-tight">Tolka <span className="text-xs font-normal text-muted-foreground">Live Alpha</span></h1>
                </div>
                <Button variant="ghost" size="icon">
                    <Settings className="w-5 h-5" />
                </Button>
            </header>

            {/* 2. Main Content (Scrollable Transcript) */}
            <ScrollArea className="flex-1 p-4">
                <div className="max-w-2xl mx-auto space-y-6 pb-20">

                    {/* Statische / Alte Nachrichten */}
                    {staticTranscripts.map((t) => (
                        <div key={t.id} className="flex flex-col gap-1 opacity-60">
                            <span className={`text-xs font-bold uppercase tracking-wider ${t.color}`}>
                                {t.speaker}
                            </span>
                            <p className="leading-relaxed" style={{ fontSize: `${fontSize[0]}px` }}>
                                {t.text}
                            </p>
                        </div>
                    ))}

                    {/* LIVE Transkription Area */}
                    {(committedText || partialText || isRecording) && (
                        <div className="flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-500 flex items-center gap-2">
                                Live {isRecording && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"/>}
                            </span>

                            <p
                                className="leading-relaxed font-medium"
                                style={{ fontSize: `${fontSize[0]}px` }}
                            >
                                {/* 1. Der fertige Text (Normal / Schwarz) */}
                                <span>{committedText}</span>

                                {/* 2. Ein Leerzeichen, falls beide existieren */}
                                {committedText && partialText && " "}

                                {/* 3. Der vorläufige Text (Grau / Italic / Heller) */}
                                <span className="text-muted-foreground italic opacity-70 transition-opacity duration-200">
                                    {partialText}
                                </span>

                                {/* Cursor Simulation */}
                                {isRecording && <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-blue-500 animate-pulse opacity-50"/>}
                            </p>
                        </div>                    )}

                    {/* Error Anzeige */}
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md flex items-center gap-2 text-red-500 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* 3. Footer Controls */}
            <div className="p-4 border-t border-border bg-card/80 backdrop-blur-md sticky bottom-0 z-10">
                <div className="max-w-2xl mx-auto flex flex-col gap-4">

                    {/* Schriftgrössen-Slider */}
                    <div className="flex items-center gap-4">
                        <Type className="w-4 h-4 text-muted-foreground" />
                        <Slider
                            value={fontSize}
                            onValueChange={setFontSize}
                            max={42} // Etwas erhöht für bessere Accessibility
                            min={14}
                            step={1}
                            className="flex-1"
                        />
                        <span className="text-sm font-mono w-8 text-right">{fontSize}px</span>
                    </div>

                    <Separator />

                    {/* Action Button */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {isRecording ? <Mic className="w-4 h-4 text-red-500" /> : <MicOff className="w-4 h-4 text-muted-foreground" />}
                            <span className={`text-sm font-medium ${isRecording ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {isRecording ? 'Mikrofon aktiv' : 'Mikrofon aus'}
                            </span>

                            <Switch
                                checked={isRecording}
                                onCheckedChange={handleMicToggle}
                            />
                        </div>

                        {/* Debug Info / Connection Check */}
                        <div className="text-xs text-muted-foreground hidden sm:block">
                            Server: <span className={wsUrl ? "text-green-500" : "text-red-500"}>Connected</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App