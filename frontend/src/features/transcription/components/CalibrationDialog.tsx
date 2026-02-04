import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Settings2, Check, Crown, UserCircle2, Info, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { TranscriptSegment } from "@/features/transcription/types";
import { getSpeakerColor } from "@/features/transcription/utils/speakerColors";

interface Props {
    role: 'host' | 'viewer';
    segments: TranscriptSegment[];
    registry: Record<string, { name: string; position: number }>;
    updateSpeaker: (id: string, name: string, pos: number) => void;
    calibrateView: (angle: number) => void;
    onHostNameChange?: (name: string) => void;
}

export function CalibrationDialog({ role, segments, registry, updateSpeaker, calibrateView, onHostNameChange }: Props) {
    const [isOpen, setIsOpen] = useState(false);

    // UI State
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Temp State für Bearbeitung
    const [tempName, setTempName] = useState("");
    const [tempPos, setTempPos] = useState(0);

    // Sammle alle IDs (aus Transkripten + bereits gespeicherte)
    const allSpeakers = useMemo(() => {
        const fromSegments = segments.map(s => s.speaker).filter(s => s && s !== 'Unknown');
        const fromRegistry = Object.keys(registry);
        return Array.from(new Set([...fromSegments, ...fromRegistry])).sort();
    }, [segments, registry]);

    // Cleanup bei Close
    useEffect(() => {
        if (!isOpen) setSelectedId(null);
    }, [isOpen]);

    // --- ACTIONS ---

    const startEditing = (id: string) => {
        const current = registry[id];
        setSelectedId(id);
        setTempName(current?.name || "");
        setTempPos(current?.position || 0);
    };

    const saveSelection = () => {
        if (!selectedId) return;
        const finalName = tempName.trim() ? tempName.trim() : selectedId;
        updateSpeaker(selectedId, finalName, tempPos);
        setSelectedId(null);
    };

    const claimAsHost = () => {
        if (!selectedId) return;
        const nameToSave = tempName.trim() ? tempName.trim() : "Ich (Host)";
        updateSpeaker(selectedId, nameToSave, 180);
        if (onHostNameChange) onHostNameChange(nameToSave);
        setSelectedId(null);
    };

    // Viewer Logic
    const [viewerAngle, setViewerAngle] = useState(180);
    const handleViewerSlide = (val: number[]) => {
        setViewerAngle(val[0]);
        calibrateView(val[0]);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 bg-background/80 backdrop-blur shadow-sm">
                    <Settings2 className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs font-medium">
                        Kalibrieren
                    </span>
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{role === 'host' ? 'Sitzplan konfigurieren' : 'Meine Ansicht kalibrieren'}</DialogTitle>
                </DialogHeader>

                {/* --- VISUALIZER (VORSCHAU) --- */}
                <div className="flex flex-col items-center py-2 bg-muted/10 rounded-xl mb-2">
                    <div className="relative w-64 h-64 rounded-full border-4 border-muted bg-background shadow-inner flex items-center justify-center overflow-hidden">

                        {/* DEKO: TISCH */}
                        <div className="absolute inset-4 border border-dashed border-border rounded-full opacity-30 pointer-events-none" />

                        {/* STATIC: ICH (UNTEN) - Referenzpunkt */}
                        <div className="absolute bottom-3 flex flex-col items-center z-10 pointer-events-none opacity-50">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ich</span>
                        </div>

                        {/* --- HOST MODE VISUALS --- */}
                        {role === 'host' && (
                            <>
                                {/* Alle BEREITS PLATZIERTEN Sprecher */}
                                {allSpeakers.map(id => {
                                    const isEditingThisUser = id === selectedId;

                                    // Nur anzeigen wenn in Registry oder gerade in Bearbeitung
                                    if (!registry[id] && !isEditingThisUser) return null;

                                    const pos = isEditingThisUser ? tempPos : registry[id].position;
                                    const name = isEditingThisUser ? (tempName || id) : registry[id].name;

                                    // Text-Farbe holen
                                    const textColorClass = getSpeakerColor(id);

                                    const isHostPos = Math.abs(pos - 180) < 5;

                                    return (
                                        <div key={id}
                                             className={cn(
                                                 "absolute w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shadow-md transition-all duration-300 border-2",
                                                 // Background ist jetzt immer neutral/dunkel für Kontrast
                                                 "bg-background border-muted-foreground/20",
                                                 // Wenn bearbeitet: größer & Highlight
                                                 isEditingThisUser ? "scale-125 z-50 ring-4" : "z-20",
                                                 // Hier setzen wir die Textfarbe des Sprechers
                                                 textColorClass
                                             )}
                                             style={{ transform: `rotate(${pos}deg) translate(0, -105px) rotate(-${pos}deg)` }}
                                        >
                                            {isHostPos ? <UserCircle2 className="w-5 h-5"/> : name.substring(0,2).toUpperCase()}
                                        </div>
                                    )
                                })}
                            </>
                        )}

                        {/* --- VIEWER MODE VISUALS --- */}
                        {role === 'viewer' && (
                            <div
                                className="absolute w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg z-30"
                                style={{ transform: `rotate(${viewerAngle}deg) translate(0, -105px) rotate(-${viewerAngle}deg)` }}
                            >
                                <Crown className="w-5 h-5" />
                                <span className="absolute -bottom-5 text-red-600 font-bold text-xs">HOST</span>
                            </div>
                        )}

                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                        {role === 'host' ? 'Live-Vorschau der Positionen' : 'Der Kreis stellt den Tisch dar'}
                    </p>
                </div>


                {/* --- CONTROLS: HOST MODE --- */}
                {role === 'host' && !selectedId && (
                    <div className="space-y-4 animate-in slide-in-from-bottom-2">
                        <Alert className="bg-blue-50 border-blue-100 py-2">
                            <Info className="w-4 h-4 text-blue-600" />
                            <AlertDescription className="text-xs text-blue-700 ml-2">
                                <strong>Schritt 1:</strong> Lassen Sie jeden Teilnehmer kurz sprechen.<br/>
                                <strong>Schritt 2:</strong> Klicken Sie unten auf die erkannte ID zum Zuweisen.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground">Erkannte Sprecher</Label>
                            <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                                {allSpeakers.length === 0 && (
                                    <div className="col-span-2 text-center py-4 text-sm text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                                        Warte auf Audio...
                                    </div>
                                )}
                                {allSpeakers.map(id => {
                                    const isConfigured = !!registry[id];
                                    const colorClass = getSpeakerColor(id);

                                    return (
                                        <Button
                                            key={id}
                                            variant={isConfigured ? "outline" : "secondary"}
                                            className={cn(
                                                "justify-start h-auto py-2 px-3",
                                                isConfigured && "border-l-4 border-l-green-500 bg-green-50/30"
                                            )}
                                            onClick={() => startEditing(id)}
                                        >
                                            <div className="flex flex-col items-start text-left w-full overflow-hidden">
                                                <div className="flex items-center w-full gap-2">
                                                    {/* Kleiner Dot in Sprecherfarbe (nutzt bg-current um Textfarbe zu erben) */}
                                                    <div className={cn("w-2 h-2 rounded-full shrink-0 bg-current", colorClass)} />

                                                    <span className={cn("font-semibold text-sm truncate", isConfigured && "text-foreground")}>
                                                        {registry[id]?.name || id}
                                                    </span>

                                                    {isConfigured && <Check className="w-3 h-3 ml-auto text-green-600 shrink-0"/>}
                                                </div>

                                                <span className="text-[10px] text-muted-foreground pl-4">
                                                    {isConfigured ? `${registry[id].position}° Position` : "Nicht zugewiesen"}
                                                </span>
                                            </div>
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- EDITOR: HOST MODE --- */}
                {role === 'host' && selectedId && (
                    <div className="space-y-5 animate-in slide-in-from-right-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={() => setSelectedId(null)}>
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                            <span className="font-semibold">Sprecher bearbeiten</span>
                        </div>

                        <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
                            <div className="space-y-1">
                                <Label>Wer ist das? (ID: {selectedId})</Label>
                                <Input
                                    value={tempName}
                                    onChange={e => setTempName(e.target.value)}
                                    placeholder="Name eingeben (z.B. Fritz)"
                                    className="bg-background"
                                    autoFocus
                                />
                            </div>

                            <div className="pt-2">
                                <Button
                                    variant="outline"
                                    className="w-full gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                                    onClick={claimAsHost}
                                >
                                    <UserCircle2 className="w-4 h-4" />
                                    Das bin ich (Host)
                                </Button>
                                <p className="text-[10px] text-muted-foreground text-center mt-1">
                                    Nimmt Namen oben (oder "Ich") & setzt Position auf Unten.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label>Wo sitzt diese Person?</Label>
                                <span className="text-xs font-mono bg-muted px-2 py-1 rounded">{tempPos}°</span>
                            </div>

                            {/* DER SLIDER */}
                            <Slider
                                value={[tempPos]}
                                max={360}
                                step={5}
                                onValueChange={(vals) => setTempPos(vals[0])}
                                className="py-4 cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                                <span>Oben</span>
                                <span>Rechts</span>
                                <span>Unten</span>
                                <span>Links</span>
                                <span>Oben</span>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0 mt-4">
                            <Button variant="ghost" onClick={() => setSelectedId(null)}>Abbrechen</Button>
                            <Button onClick={saveSelection}>Speichern</Button>
                        </DialogFooter>
                    </div>
                )}


                {/* --- CONTROLS: VIEWER MODE --- */}
                {role === 'viewer' && (
                    <div className="space-y-6 pt-2">
                        <Alert>
                            <Info className="w-4 h-4" />
                            <AlertDescription className="text-xs">
                                Schauen Sie sich im Raum um. Wo sitzt der Host (die Person mit dem Tablet)?
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label>Position des Hosts</Label>
                                <span className="text-xs font-mono bg-muted px-2 py-1 rounded">{viewerAngle}°</span>
                            </div>

                            <Slider
                                value={[viewerAngle]}
                                max={360}
                                step={5}
                                onValueChange={handleViewerSlide}
                                className="py-4"
                            />

                            <p className="text-xs text-center text-muted-foreground">
                                Schieben Sie den Regler, bis der rote Punkt auf dem Kreis mit der echten Position übereinstimmt.
                            </p>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}