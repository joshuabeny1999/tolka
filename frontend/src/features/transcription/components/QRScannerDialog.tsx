import { useState } from "react";
import { QrReader } from "@blackbox-vision/react-qr-reader";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScanLine, Loader2 } from "lucide-react";

export function QRScannerDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleScan = (result: any) => {
        if (result && !loading) {
            const url = result?.text;
            if (url && url.includes("?room=")) {
                setLoading(true);
                window.location.href = url;
            }
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2 h-12 text-base">
                    <ScanLine className="w-5 h-5" />
                    Scan to Join
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-center">QR-Code scannen</DialogTitle>
                </DialogHeader>

                {/* WICHTIG: Wir entfernen 'aspect-square' und 'relative' hier teilweise,
                   da die Library das selbst handeln will.
                   Wir geben eine feste Mindesthöhe oder lassen die Library den Platz füllen.
                */}
                <div className="w-full overflow-hidden rounded-lg bg-black relative min-h-[300px]">

                    {isOpen && ( // Render nur, wenn Dialog offen ist (spart Performance/Kamera-Zugriff)
                        <QrReader
                            onResult={handleScan}
                            constraints={{ facingMode: 'environment' }}

                            // 1. Container Style: Erzwingt volle Breite/Höhe ohne Padding-Hack Konflikte
                            containerStyle={{
                                width: '100%',
                                height: '100%',
                                paddingTop: 0 // Wichtig: Überschreibt den Default der Library
                            }}

                            // 2. Video Style: Sorgt dafür, dass das Video den Bereich füllt
                            videoContainerStyle={{
                                height: '100%',
                                width: '100%',
                                paddingTop: 0
                            }}

                            videoStyle={{
                                height: '100%',
                                width: '100%',
                                objectFit: 'cover', // Füllt den Rahmen
                                position: 'absolute',
                                top: 0,
                                left: 0
                            }}
                        />
                    )}

                    {/* Overlay Frame */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        {/* Halbtransparenter Hintergrund um den Fokusbereich */}
                        <div className="absolute inset-0 bg-black/40" />

                        {/* Der "Cutout" Effekt (Simuliert durch Border oder Masking ist schwerer, hier simpler Frame) */}
                        <div className="w-56 h-56 border-2 border-white/70 rounded-lg relative z-20 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white -mt-1 -ml-1 rounded-tl-sm"></div>
                            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white -mt-1 -mr-1 rounded-tr-sm"></div>
                            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white -mb-1 -ml-1 rounded-bl-sm"></div>
                            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white -mb-1 -mr-1 rounded-br-sm"></div>
                        </div>
                    </div>

                    {loading && (
                        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-white z-50">
                            <Loader2 className="w-10 h-10 animate-spin mb-2" />
                            <p>Verbinde...</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}