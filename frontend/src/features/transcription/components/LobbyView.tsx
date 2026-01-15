import { Button } from "@/components/ui/button";
import { Captions as CaptionsIcon } from "lucide-react";
import { QRScannerDialog } from "./QRScannerDialog";
import type { ProviderType } from "../types";

interface LobbyViewProps {
    onCreateSession: (provider: ProviderType) => void;
}

export function LobbyView({ onCreateSession }: LobbyViewProps) {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
                        <CaptionsIcon className="w-6 h-6 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">Tolka Live</h1>
                    <p className="text-muted-foreground">
                        Echtzeit-Transkription für Gruppengespräche.
                    </p>
                </div>

                <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
                    {/* Option A: Join existing via Scan */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Einem Gespräch beitreten</h2>
                        <QRScannerDialog />
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">Oder neu starten</span>
                        </div>
                    </div>

                    {/* Option B: Host new session */}
                    <div className="space-y-3">
                        <Button onClick={() => onCreateSession('azure')} className="w-full" variant="secondary">
                            Host mit Azure Speech
                        </Button>
                        <Button onClick={() => onCreateSession('deepgram')} className="w-full" variant="outline">
                            Host mit Deepgram
                        </Button>
                        <Button onClick={() => onCreateSession('mock')} className="w-full" variant="ghost">
                            Simulation starten
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}