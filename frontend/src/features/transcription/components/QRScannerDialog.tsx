import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScanLine, Loader2, AlertCircle } from "lucide-react";

export function QRScannerDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const scannerRef = useRef<Html5Qrcode | null>(null);
    const isScanningRef = useRef(false);

    const onScanSuccess = (decodedText: string) => {
        if (loading) return;

        if (decodedText && decodedText.includes("?room=")) {
            setLoading(true);
            console.log("QR Code gefunden:", decodedText);

            if (scannerRef.current && isScanningRef.current) {
                scannerRef.current.stop().then(() => {
                    scannerRef.current?.clear();
                    window.location.href = decodedText;
                }).catch(err => console.error("Stop failed", err));
            } else {
                window.location.href = decodedText;
            }
        }
    };

    useEffect(() => {
        let scanner: Html5Qrcode | null = null;
        const elementId = "qr-reader-mount";

        if (isOpen && !loading) {
            // Kurze Verzögerung, damit das DOM (der Dialog) sicher gerendert ist
            const timeoutId = setTimeout(() => {
                if (isScanningRef.current) return; // Schutz gegen doppelten Start

                scanner = new Html5Qrcode(elementId);
                scannerRef.current = scanner;

                const config = {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                    formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
                };

                scanner.start(
                    { facingMode: "environment" }, // Nutzt die Rückkamera
                    config,
                    onScanSuccess,
                    undefined
                ).then(() => {
                    isScanningRef.current = true;
                    setError(null);
                }).catch((err) => {
                    console.error("Kamera Start-Fehler:", err);
                    setError("Kamera konnte nicht gestartet werden. Bitte Berechtigungen prüfen.");
                    isScanningRef.current = false;
                });
            }, 100);

            return () => {
                clearTimeout(timeoutId);
                if (scanner && isScanningRef.current) {
                    scanner.stop().then(() => {
                        return scanner?.clear();
                    }).catch(err => console.error("Cleanup error", err))
                        .finally(() => {
                            isScanningRef.current = false;
                        });
                }
            };
        }
    }, [isOpen, loading]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) {
                setLoading(false); // Reset loading state bei Close
                setError(null);
            }
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2 h-12 text-base">
                    <ScanLine className="w-5 h-5" />
                    Scan to Join
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-center">QR-Code scannen</DialogTitle>
                    <DialogDescription className="text-center text-xs">
                        Halten Sie die Kamera auf den Code des Hosts.
                    </DialogDescription>
                </DialogHeader>

                <div className="w-full overflow-hidden rounded-lg bg-black relative min-h-[300px] flex items-center justify-center">

                    <div id="qr-reader-mount" className="w-full h-full absolute inset-0 object-cover" />

                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                        {/* Cutout Rahmen */}
                        <div className="w-64 h-64 border-2 border-white/70 rounded-lg relative bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white -mt-1 -ml-1 rounded-tl-sm"></div>
                            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white -mt-1 -mr-1 rounded-tr-sm"></div>
                            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white -mb-1 -ml-1 rounded-bl-sm"></div>
                            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white -mb-1 -mr-1 rounded-br-sm"></div>
                        </div>
                    </div>

                    {loading && (
                        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-white z-50">
                            <Loader2 className="w-10 h-10 animate-spin mb-2" />
                            <p>Verbinde mit Raum...</p>
                        </div>
                    )}

                    {error && (
                        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-red-500 z-40 p-4 text-center">
                            <AlertCircle className="w-10 h-10 mb-2" />
                            <p>{error}</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}