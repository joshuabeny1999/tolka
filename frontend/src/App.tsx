import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Mic, MicOff, Settings, Type } from "lucide-react"

function App() {
    const [fontSize, setFontSize] = useState([18])
    const [isListening, setIsListening] = useState(false)

    // Dummy-Daten für die UI Preview
    const transcripts = [
        { id: 1, speaker: "Joshua", text: "Willkommen zu Tolka. Das ist ein Test.", color: "text-blue-400" },
        { id: 2, speaker: "Dozent", text: "Hervorragend. Wie funktioniert die Latenz?", color: "text-amber-400" },
        { id: 3, speaker: "Joshua", text: "Wir nutzen WebSockets über Go. Die Latenz sollte unter 200ms liegen.", color: "text-blue-400" },
        { id: 4, speaker: "Gruppe", text: "(Zustimmendes Gemurmel)", color: "text-zinc-500 italic" },
    ]

    return (
        // h-screen erzwingt volle Höhe, bg-background nutzt die Zinc-Farbe
        <div className="flex flex-col h-screen bg-background text-foreground">

            {/* 1. Header Area */}
            <header className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                    <h1 className="text-xl font-bold tracking-tight">Tolka <span className="text-xs font-normal text-muted-foreground">Live Alpha</span></h1>
                </div>
                <Button variant="ghost" size="icon">
                    <Settings className="w-5 h-5" />
                </Button>
            </header>

            {/* 2. Main Content (Scrollable Transcript) */}
            <ScrollArea className="flex-1 p-4">
                <div className="max-w-2xl mx-auto space-y-6">
                    {transcripts.map((t) => (
                        <div key={t.id} className="flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <span className={`text-xs font-bold uppercase tracking-wider ${t.color}`}>
                {t.speaker}
              </span>
                            <p
                                className="leading-relaxed"
                                style={{ fontSize: `${fontSize[0]}px` }}
                            >
                                {t.text}
                            </p>
                        </div>
                    ))}

                    {/* Platzhalter für "Live" Indikator */}
                    {isListening && (
                        <div className="flex items-center gap-2 text-muted-foreground pt-4">
                            <span className="text-sm italic">Hört zu...</span>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* 3. Footer Controls */}
            <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
                <div className="max-w-2xl mx-auto flex flex-col gap-4">

                    {/* Schriftgrössen-Slider (HCI Requirement!) */}
                    <div className="flex items-center gap-4">
                        <Type className="w-4 h-4 text-muted-foreground" />
                        <Slider
                            value={fontSize}
                            onValueChange={setFontSize}
                            max={32}
                            min={14}
                            step={1}
                            className="flex-1"
                        />
                        <span className="text-sm font-mono w-6">{fontSize}</span>
                    </div>

                    <Separator />

                    {/* Action Button */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Mikrofon</span>
                            <Switch checked={isListening} onCheckedChange={setIsListening} />
                        </div>

                        {/* Test Backend Connection */}
                        <Button variant="outline" size="sm" asChild>
                            <a href="/api/hello" target="_blank">Check API</a>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App