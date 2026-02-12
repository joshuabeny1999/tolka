import { useState, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {EyeOff} from "lucide-react";
import type { TranscriptSegment } from "@/features/transcription/types";
import { getSpeakerColor } from "@/features/transcription/utils/speakerColors";
import {Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldTitle} from "@/components/ui/field.tsx";
import {Switch} from "@/components/ui/switch.tsx";
import {cn} from "@/lib/utils.ts";

interface Props {
    segments: TranscriptSegment[];
    registry: Record<string, { name: string; position: number, hidden: boolean }>;
    updateSpeakerHiddenStatus: (id: string, hidden: boolean) => void;
}

export function HideSpeakersDialog({ segments, registry, updateSpeakerHiddenStatus}: Props) {
    const [isOpen, setIsOpen] = useState(false);


    // Sammle alle IDs
    const allSpeakers = useMemo(() => {
        const fromSegments = segments.map(s => s.speaker).filter(s => s && s !== 'Unknown');
        const fromRegistry = Object.keys(registry);
        return Array.from(new Set([...fromSegments, ...fromRegistry])).sort();
    }, [segments, registry]);


    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <div className="flex items-center bg-secondary/30 rounded-full p-1 border border-border/50">
                <Button variant="ghost" size="sm">
                    <EyeOff className="w-4 h-4" />
                    <span className="text-xs font-medium">
                        Hide Speakers
                    </span>
                </Button>
                </div>
            </DialogTrigger>

            <DialogContent
                className="sm:max-w-md flex flex-col max-h-[90vh] overflow-y-auto"
            >
                <DialogHeader>
                    <DialogTitle>Hide Speakers</DialogTitle>
                </DialogHeader>
                <DialogDescription>
                    Ausgeblendete Sprecher werden im Transkript nicht angezeigt.
                    <em> Hinweis: Bei falscher Sprecherzuordnung kann dadurch Text fehlen.</em>
                </DialogDescription>

                <FieldGroup className="w-full max-w-sm">
                    {allSpeakers.map(id => {
                        const colorClass = getSpeakerColor(id);
                        const hiddenStatus = registry[id] ? registry[id].hidden : false;

                        return (
                            <FieldLabel htmlFor={id}>
                                <Field orientation="horizontal">
                                    <FieldContent>
                                        <FieldTitle>
                                            <div className={cn("w-2 h-2 rounded-full shrink-0 bg-current", colorClass)} />
                                            <span className={cn("font-semibold text-sm truncate")}>
                                                        {registry[id]?.name || id}
                                                    </span>

                                        </FieldTitle>
                                        <FieldDescription>
                                        </FieldDescription>
                                    </FieldContent>
                                    <Switch id={id} checked={!hiddenStatus} onCheckedChange={
                                        (checked) => updateSpeakerHiddenStatus(id, !checked)
                                    } />
                                </Field>
                            </FieldLabel>
                        )
                    })}
                </FieldGroup>
            </DialogContent>
        </Dialog>
    );
}