import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
    Settings,
    Type,
    Mic,
    MicOff,
    AlertCircle,
    Cloud,
    Activity,
    TestTube // Icon für Mock
} from "lucide-react"

// Hooks importieren
import { useAudioStreamDeepgram } from "./hooks/useAudioStreamDeepgram"
import { useAudioStreamAzure } from "./hooks/useAudioStreamAzure"
import { useAudioStreamMock } from "./hooks/useAudioStreamMock" // Neuer Import

declare global {
    interface Window {
        TOLKA_CONFIG?: {
            WS_TOKEN: string;
        };
    }
}

// Typ erweitert um 'mock'
type ProviderType = 'azure' | 'deepgram' | 'mock';

function App() {
    // 1. Setup Logic & State
    const [fontSize, setFontSize] = useState([18]);
    const [provider, setProvider] = useState<ProviderType>('azure');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = `${protocol}//${window.location.hostname}:${window.location.port}`;
    const token = window.TOLKA_CONFIG?.WS_TOKEN || "";

    const urlAzure = `${host}/ws/azure?token=${token}`;
    const urlDeepgram = `${host}/ws/deepgram?token=${token}`;
    const urlMock = `${host}/ws/mock?token=${token}`; // Mock URL

    // 2. Alle Hooks initialisieren
    const azureStream = useAudioStreamAzure(urlAzure);
    const deepgramStream = useAudioStreamDeepgram(urlDeepgram);
    const mockStream = useAudioStreamMock(urlMock);

    // 3. Den "aktiven" Stream auswählen
    let activeStream;
    let themeColor; // Hilfsvariable für UI Farben

    switch (provider) {
        case 'deepgram':
            activeStream = deepgramStream;
            themeColor = 'text-green-500';
            break;
        case 'mock':
            activeStream = mockStream;
            themeColor = 'text-orange-500';
            break;
        case 'azure':
        default:
            activeStream = azureStream;
            themeColor = 'text-blue-500';
            break;
    }

    const {
        isRecording,
        committedText,
        partialText,
        startRecording,
        stopRecording,
        error
    } = activeStream;

    const handleMicToggle = (checked: boolean) => {
        if (checked) {
            startRecording();
        } else {
            stopRecording();
        }
    };

    const handleProviderChange = (newProvider: ProviderType) => {
        if (isRecording) {
            stopRecording();
        }
        setProvider(newProvider);
    };

    const staticTranscripts = [
        { id: 1, speaker: "System", text: "Bereit für Live-Transkription...", color: "text-zinc-500 italic" },
    ];

    // Helper für Header-Anzeige
    const getProviderBadge = () => {
        switch (provider) {
            case 'azure':
                return <><Cloud className="w-3 h-3 text-blue-500" /> Microsoft Azure (Swiss North)</>;
            case 'deepgram':
                return <><Activity className="w-3 h-3 text-green-500" /> Deepgram Nova-3</>;
            case 'mock':
                return <><TestTube className="w-3 h-3 text-orange-500" /> Mock Stream (Simulated)</>;
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background text-foreground">

            {/* 1. Header Area */}
            <header className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full transition-colors duration-300 ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                    <h1 className="text-xl font-bold tracking-tight">Tolka <span className="text-xs font-normal text-muted-foreground">Live Alpha</span></h1>
                </div>

                <div className="hidden md:flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-secondary/50">
                    {getProviderBadge()}
                </div>

                <Button variant="ghost" size="icon">
                    <Settings className="w-5 h-5" />
                </Button>
            </header>

            {/* 2. Main Content */}
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
                            <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${themeColor}`}>
                                Live {isRecording && <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${provider === 'mock' ? 'bg-orange-500' : provider === 'deepgram' ? 'bg-green-500' : 'bg-blue-500'}`}/>}
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
                                {isRecording && <span className={`inline-block w-1.5 h-4 ml-1 align-middle animate-pulse opacity-50 ${provider === 'mock' ? 'bg-orange-500' : provider === 'deepgram' ? 'bg-green-500' : 'bg-blue-500'}`}/>}
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
                        <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg overflow-x-auto max-w-full">
                            <Button
                                variant={provider === 'azure' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => handleProviderChange('azure')}
                                className={`text-xs h-7 px-3 ${provider === 'azure' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                            >
                                Azure
                            </Button>
                            <Button
                                variant={provider === 'deepgram' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => handleProviderChange('deepgram')}
                                className={`text-xs h-7 px-3 ${provider === 'deepgram' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                            >
                                Deepgram
                            </Button>
                            <Button
                                variant={provider === 'mock' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => handleProviderChange('mock')}
                                className={`text-xs h-7 px-3 ${provider === 'mock' ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
                            >
                                Mock
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    {/* Mic Action */}
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

                        <div className="text-xs text-muted-foreground hidden sm:block">
                            Engine: <span className={themeColor}>
                                {provider === 'azure' ? 'Azure Speech' : provider === 'deepgram' ? 'Deepgram Nova-3' : 'Simulated Stream'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App