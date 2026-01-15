import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
    Mic,
    MicOff,
    Settings,
    AArrowUp,
    AArrowDown,
    ArrowDownToLine,
    Check,
    Cloud,
    Activity,
    TestTube,
    Radio
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProviderType } from "../types";

interface ControlsProps {
    fontSize: number;
    setFontSize: (size: number) => void;
    isRecording: boolean;
    onToggleRecording: (val: boolean) => void;
    provider: ProviderType;
    setProvider: (provider: ProviderType) => void;
    accentColor: string;
    engineName: string;
    autoScroll: boolean;
    setAutoScroll: (enabled: boolean) => void;
    readOnly?: boolean;
}

export function Controls({
                             fontSize,
                             setFontSize,
                             isRecording,
                             onToggleRecording,
                             provider,
                             setProvider,
                             accentColor,
                             engineName,
                             autoScroll,
                             setAutoScroll,
                             readOnly = false
                         }: ControlsProps) {

    const adjustFont = (delta: number) => {
        setFontSize(Math.max(14, Math.min(42, fontSize + delta)));
    };

    return (
        <div className="border-t border-border bg-card/90 backdrop-blur p-4 pb-8 md:pb-4">
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">

                {/* Left: Visual Preferences (Available to everyone) */}
                <div className="flex items-center gap-2 order-2 md:order-1">
                    <div className="flex items-center bg-secondary/30 rounded-full p-1 border border-border/50">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => adjustFont(-2)}
                            disabled={fontSize <= 14}
                        >
                            <AArrowDown className="w-4 h-4" />
                        </Button>
                        <span className="w-10 text-center font-mono text-xs text-muted-foreground select-none">
                            {fontSize}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => adjustFont(2)}
                            disabled={fontSize >= 42}
                        >
                            <AArrowUp className="w-4 h-4" />
                        </Button>
                    </div>

                    <Button
                        variant={autoScroll ? "secondary" : "ghost"}
                        size="icon"
                        onClick={() => setAutoScroll(!autoScroll)}
                        className={cn("h-10 w-10 rounded-full transition-all", autoScroll && "bg-blue-500/15 text-blue-600")}
                    >
                        <ArrowDownToLine className={cn("w-4 h-4", !autoScroll && "opacity-50")} />
                    </Button>
                </div>

                {/* Center: Action Button (Host vs Viewer) */}
                <div className="flex items-center gap-3 order-1 md:order-2">
                    {readOnly ? (
                        // VIEWER VIEW
                        <div className="flex items-center gap-3 px-6 py-2 rounded-full border border-border/60 bg-secondary/20">
                            <Radio className={cn("w-4 h-4 animate-pulse", isRecording ? "text-green-500" : "text-muted-foreground")} />
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {isRecording ? "Receiving Live Audio" : "Waiting for Host"}
                            </span>
                        </div>
                    ) : (
                        // HOST VIEW
                        <div className={cn(
                            "flex items-center gap-3 px-4 py-2 rounded-full border transition-all duration-300",
                            isRecording
                                ? "bg-red-500/5 border-red-200 shadow-[0_0_15px_-3px_rgba(239,68,68,0.2)]"
                                : "bg-background border-border"
                        )}>
                            {isRecording ? (
                                <Mic className="w-5 h-5 text-red-500 animate-pulse" />
                            ) : (
                                <MicOff className="w-5 h-5 text-muted-foreground" />
                            )}
                            <div className="flex flex-col">
                                <span className={cn("text-xs font-bold uppercase tracking-wider", isRecording ? "text-red-600" : "text-muted-foreground")}>
                                    {isRecording ? "On Air" : "Offline"}
                                </span>
                            </div>
                            <Switch
                                checked={isRecording}
                                onCheckedChange={onToggleRecording}
                                className="ml-2 data-[state=checked]:bg-red-500"
                            />
                        </div>
                    )}
                </div>

                {/* Right: Settings (Host Only) */}
                <div className="flex items-center justify-end min-w-[140px] order-3">
                    {!readOnly && (
                        <>
                            <div className="hidden sm:flex flex-col items-end mr-3">
                                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Provider</span>
                                <span className={cn("text-xs font-medium truncate max-w-[120px]", accentColor)}>
                                    {engineName}
                                </span>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                                        <Settings className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel>Audio Engine</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setProvider('azure')}>
                                        <Cloud className="mr-2 h-4 w-4 text-blue-500" />
                                        <span>Azure Speech</span>
                                        {provider === 'azure' && <Check className="ml-auto h-4 w-4" />}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setProvider('deepgram')}>
                                        <Activity className="mr-2 h-4 w-4 text-green-500" />
                                        <span>Deepgram Nova-3</span>
                                        {provider === 'deepgram' && <Check className="ml-auto h-4 w-4" />}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setProvider('mock')}>
                                        <TestTube className="mr-2 h-4 w-4 text-orange-500" />
                                        <span>Simulated Stream</span>
                                        {provider === 'mock' && <Check className="ml-auto h-4 w-4" />}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}