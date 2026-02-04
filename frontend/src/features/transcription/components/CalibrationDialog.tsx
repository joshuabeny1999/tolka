import { useState, useMemo, useEffect, useRef } from "react";
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

    // Temp State für Bearbeitung (Host)
    const [tempName, setTempName] = useState("");
    const [tempPos, setTempPos] = useState(0);
    const [nameError, setNameError] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // State für Viewer
    const [viewerAngle, setViewerAngle] = useState(180);

    const circleRef = useRef<HTMLDivElement>(null);

    // Sammle alle IDs
    const allSpeakers = useMemo(() => {
        const fromSegments = segments.map(s => s.speaker).filter(s => s && s !== 'Unknown');
        const fromRegistry = Object.keys(registry);
        return Array.from(new Set([...fromSegments, ...fromRegistry])).sort();
    }, [segments, registry]);

    // Cleanup bei Close
    useEffect(() => {
        if (!isOpen) {
            setSelectedId(null);
            setNameError(false);
        }
    }, [isOpen]);

    // --- ACTIONS HOST ---

    const startEditing = (id: string) => {
        const current = registry[id];
        setSelectedId(id);
        setTempName(current?.name || "");
        setTempPos(current?.position || 0);
        setNameError(false);
    };

    const validateAndSave = (overrideName?: string, overridePos?: number) => {
        if (!selectedId) return;

        const nameToCheck = overrideName !== undefined ? overrideName : tempName;

        if (!nameToCheck.trim()) {
            setNameError(true);
            return;
        }

        const finalName = nameToCheck.trim();
        const finalPos = overridePos !== undefined ? overridePos : tempPos;

        updateSpeaker(selectedId, finalName, finalPos);

        if (overrideName && onHostNameChange) {
            onHostNameChange(finalName);
        }

        setSelectedId(null);
        setNameError(false);
    };

    const saveSelection = () => {
        validateAndSave();
    };

    const claimAsHost = () => {
        const nameToSave = tempName.trim() ? `${tempName.trim()} (Host)` : "";
        validateAndSave(nameToSave, 180);    };

    // --- VIEWER ACTIONS ---

    const handleViewerSlide = (val: number[]) => {
        setViewerAngle(val[0]);
        calibrateView(val[0]);
    };

    // --- SHARED INTERACTION (MOUSE & TOUCH) ---

    const getEventCoords = (e: React.MouseEvent | React.TouchEvent) => {
        if ('touches' in e) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        // Type Casting da wir wissen es ist MouseEvent wenn nicht Touch
        const mouseE = e as React.MouseEvent;
        return { x: mouseE.clientX, y: mouseE.clientY };
    };

    const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
        // Blockieren, wenn Host nichts ausgewählt hat. Viewer darf immer.
        if (role === 'host' && !selectedId) return;
        if (!circleRef.current) return;

        // Verhindert Scrollen auf Mobile während der Interaktion
        // (Nur nötig wenn touch-action im CSS nicht greift, schadet aber nicht)
        // e.preventDefault();

        const coords = getEventCoords(e);
        const rect = circleRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const x = coords.x - centerX;
        const y = coords.y - centerY;

        let angleDeg = Math.atan2(y, x) * (180 / Math.PI);
        angleDeg += 90;

        if (angleDeg < 0) angleDeg += 360;

        const finalAngle = Math.round(angleDeg);

        if (role === 'host') {
            setTempPos(finalAngle);
        } else {
            setViewerAngle(finalAngle);
            calibrateView(finalAngle);
        }
    };

    const handleStart = () => setIsDragging(true);
    const handleEnd = () => setIsDragging(false);

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (isDragging) {
            handleInteraction(e);
        }
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

            <DialogContent
                className="sm:max-w-md flex flex-col max-h-[90vh] overflow-y-auto"
            >
                <DialogHeader>
                    <DialogTitle>{role === 'host' ? 'Sitzplan konfigurieren' : 'Meine Ansicht kalibrieren'}</DialogTitle>
                </DialogHeader>

                {/* --- VISUALIZER (VORSCHAU) --- */}
                <div className="flex flex-col items-center py-2 bg-muted/10 rounded-xl mb-2">
                    <div
                        ref={circleRef}
                        className={cn(
                            "relative w-64 h-64 rounded-full border-4 border-muted bg-background shadow-inner flex items-center justify-center overflow-hidden select-none",
                            // Cursor Logik: Host im Edit-Mode ODER Viewer immer
                            ((role === 'host' && selectedId) || role === 'viewer') ? "cursor-crosshair active:cursor-grabbing" : ""
                        )}
                        onMouseDown={handleStart}
                        onMouseMove={handleMove}
                        onMouseUp={handleEnd}
                        onMouseLeave={handleEnd}
                        onClick={handleInteraction}

                        // Touch Events (Mobile)
                        onTouchStart={handleStart}
                        onTouchMove={handleMove}
                        onTouchEnd={handleEnd}                    >

                        {/* DEKO: TISCH */}
                        <div className="absolute inset-4 border border-dashed border-border rounded-full opacity-30 pointer-events-none" />

                        {/* STATIC: ICH (UNTEN) */}
                        <div className="absolute bottom-3 flex flex-col items-center z-10 pointer-events-none opacity-50">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ich</span>
                        </div>

                        {/* --- HOST MODE VISUALS --- */}
                        {role === 'host' && (
                            <>
                                {allSpeakers.map(id => {
                                    const isEditingThisUser = id === selectedId;
                                    if (!registry[id] && !isEditingThisUser) return null;

                                    const pos = isEditingThisUser ? tempPos : registry[id].position;
                                    const name = isEditingThisUser ? (tempName || id) : registry[id].name;
                                    const textColorClass = getSpeakerColor(id);
                                    const isHostPos = Math.abs(pos - 180) < 5;

                                    return (
                                        <div key={id}
                                             className={cn(
                                                 "absolute w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shadow-md transition-all duration-300 border-2 pointer-events-none",
                                                 "bg-background border-muted-foreground/20",
                                                 isEditingThisUser ? "scale-125 z-50 ring-4" : "z-20",
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
                                className="absolute w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg z-30 pointer-events-none"
                                style={{ transform: `rotate(${viewerAngle}deg) translate(0, -105px) rotate(-${viewerAngle}deg)` }}
                            >
                                <Crown className="w-5 h-5" />
                                <span className="absolute -bottom-5 text-red-600 font-bold text-xs">HOST</span>
                            </div>
                        )}

                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                        {/* Hinweistext anpassen je nach Status */}
                        {(role === 'viewer' || (role === 'host' && selectedId))
                            ? 'Klicken oder ziehen Sie im Kreis, um die Position zu ändern'
                            : 'Live-Vorschau der Positionen'
                        }
                    </p>
                </div>


                {/* --- CONTROLS: HOST MODE --- */}
                {role === 'host' && !selectedId && (
                    <div className="space-y-4 animate-in slide-in-from-bottom-2">
                        {/* Host Speaker List (Unverändert) */}
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
                                <Label className={cn(nameError && "text-destructive")}>
                                    Wer ist das? (ID: {selectedId}) <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    value={tempName}
                                    onChange={e => {
                                        setTempName(e.target.value);
                                        if(e.target.value.trim()) setNameError(false);
                                    }}
                                    placeholder="Name eingeben (z.B. Fritz)"
                                    className={cn("bg-background", nameError && "border-destructive focus-visible:ring-destructive")}
                                    autoFocus
                                />
                                {nameError && <p className="text-[10px] text-destructive">Bitte geben Sie einen Namen ein.</p>}
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
                                    Setzt Position auf Unten (180°). Name oben erforderlich.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label>Wo sitzt diese Person?</Label>
                                <span className="text-xs font-mono bg-muted px-2 py-1 rounded">{tempPos}°</span>
                            </div>

                            <Slider
                                value={[tempPos]}
                                max={360}
                                step={5}
                                onValueChange={(vals) => setTempPos(vals[0])}
                                className="py-4 cursor-pointer"
                            />
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
                                Schauen Sie sich  um. Wo sitzt der Host (die Person die die Sitzung mit Ihnen geteilt hat)?
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
                                Schieben Sie den Regler oder nutzen Sie den Kreis oben, um die Position anzupassen.
                            </p>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}