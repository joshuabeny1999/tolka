import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
// Falls du Shadcn Select hast, importiere es hier. Ich nutze hier einfache Buttons für den Toggle.
import { Settings, Type, Mic, MicOff, AlertCircle, Cloud, Activity } from "lucide-react"

// Beide Hooks importieren
import { useAudioStreamDeepgram } from "./hooks/useAudioStreamDeepgram"
import { useAudioStreamAzure } from "./hooks/useAudioStreamAzure" // Annahme: Datei existiert so

declare global {
    interface Window {
        TOLKA_CONFIG?: {
            WS_TOKEN: string;
        };
    }
}

type ProviderType = 'azure' | 'deepgram';

function App() {
    // 1. Setup Logic & State
    const [fontSize, setFontSize] = useState([18]);
    const [provider, setProvider] = useState<ProviderType>('azure'); // Default: Azure

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = `${protocol}//${window.location.hostname}:${window.location.port}`;
    const token = window.TOLKA_CONFIG?.WS_TOKEN || "";

    // URLs für beide Endpoints definieren
    const urlAzure = `${host}/ws/azure?token=${token}`;
    const urlDeepgram = `${host}/ws/deepgram?token=${token}`;

    // 2. Hooks initialisieren (Rules of Hooks: Müssen immer aufgerufen werden)
    const azureStream = useAudioStreamAzure(urlAzure);
    const deepgramStream = useAudioStreamDeepgram(urlDeepgram);

    // 3. Den "aktiven" Stream auswählen
    const activeStream = provider === 'azure' ? azureStream : deepgramStream;

    const {
        isRecording,
        committedText,
        partialText,
        startRecording,
        stopRecording,
        error
    } = activeStream;

    // Handler für den Switch
    const handleMicToggle = (checked: boolean) => {
        if (checked) {
            startRecording();
        } else {
            stopRecording();
        }
    };

    // Handler für Provider Wechsel (Stoppt Aufnahme falls aktiv)
    const handleProviderChange = (newProvider: ProviderType) => {
        if (isRecording) {
            stopRecording();
        }
        setProvider(newProvider);
    };

    const staticTranscripts = [
        { id: 1, speaker: "System", text: "Bereit für Live-Transkription...", color: "text-zinc-500 italic" },
    ];

    return (
        <div className="flex flex-col h-screen bg-background text-foreground">

            {/* 1. Header Area */}
            <header className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full transition-colors duration-300 ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                    <h1 className="text-xl font-bold tracking-tight">Tolka <span className="text-xs font-normal text-muted-foreground">Live Alpha</span></h1>
                </div>

                {/* Provider Anzeige im Header (Optional) */}
                <div className="hidden md:flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-secondary/50">
                    {provider === 'azure' ? <Cloud className="w-3 h-3 text-blue-500" /> : <Activity className="w-3 h-3 text-green-500" />}
                    Using {provider === 'azure' ? 'Microsoft Azure (Swiss North)' : 'Deepgram Nova-3'}
                </div>

                <Button variant="ghost" size="icon">
                    <Settings className="w-5 h-5" />
                </Button>
            </header>

            {/* 2. Main Content (Scrollable Transcript) */}
            <ScrollArea className="flex-1 p-4">
                <div className="max-w-2xl mx-auto space-y-6 pb-20">

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
                            <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${provider === 'azure' ? 'text-blue-500' : 'text-green-500'}`}>
                                Live {isRecording && <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${provider === 'azure' ? 'bg-blue-500' : 'bg-green-500'}`}/>}
                            </span>

                            <p
                                className="leading-relaxed font-medium"
                                style={{ fontSize: `${fontSize[0]}px` }}
                            >
                                <span>{committedText}</span>
                                {committedText && partialText && " "}
                                <span className="text-muted-foreground italic opacity-70 transition-opacity duration-200">
                                    {partialText}
                                </span>
                                {isRecording && <span className={`inline-block w-1.5 h-4 ml-1 align-middle animate-pulse opacity-50 ${provider === 'azure' ? 'bg-blue-500' : 'bg-green-500'}`}/>}
                            </p>
                        </div>
                    )}

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
                <div className="max-w-2xl mx-auto flex flex-col gap-6">

                    {/* Controls Row: Font Size & Provider Toggle */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">

                        {/* Font Size */}
                        <div className="flex items-center gap-4 w-full sm:w-1/2">
                            <Type className="w-4 h-4 text-muted-foreground" />
                            <Slider
                                value={fontSize}
                                onValueChange={setFontSize}
                                max={42}
                                min={14}
                                step={1}
                                className="flex-1"
                            />
                            <span className="text-sm font-mono w-8 text-right">{fontSize}px</span>
                        </div>

                        <Separator orientation="vertical" className="h-8 hidden sm:block" />

                        {/* Provider Toggle */}
                        <div className="flex items-center gap-2 bg-secondary/50 p-1 rounded-lg">
                            <Button
                                variant={provider === 'azure' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => handleProviderChange('azure')}
                                className={`text-xs h-7 ${provider === 'azure' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                            >
                                Azure
                            </Button>
                            <Button
                                variant={provider === 'deepgram' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => handleProviderChange('deepgram')}
                                className={`text-xs h-7 ${provider === 'deepgram' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                            >
                                Deepgram
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    {/* Mic Action Button */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {isRecording ? <Mic className="w-4 h-4 text-red-500" /> : <MicOff className="w-4 h-4 text-muted-foreground" />}
                            <span className={`text-sm font-medium ${isRecording ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {isRecording ? 'Aufnahme läuft' : 'Aufnahme starten'}
                            </span>

                            <Switch
                                checked={isRecording}
                                onCheckedChange={handleMicToggle}
                            />
                        </div>

                        {/* Debug Info */}
                        <div className="text-xs text-muted-foreground hidden sm:block">
                            Engine: <span className={provider === 'azure' ? "text-blue-500" : "text-green-500"}>
                                {provider === 'azure' ? 'Azure Speech' : 'Deepgram Nova-3'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App