import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Check, Copy, Users} from "lucide-react";
import QRCode from "react-qr-code";
import {Label} from "@radix-ui/react-dropdown-menu";
import {Input} from "@/components/ui/input.tsx";
import {useState} from "react";

export function InviteDialog() {

    const [copied, setCopied] = useState(false);

    // URL für den Share-Dialog
    const getShareUrl = () => {
        const url = new URL(window.location.href);
        url.searchParams.delete('role'); // Viewer darf kein Host sein
        return url.toString();
    };
    const shareUrl = getShareUrl();

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };


    return <Dialog>
        <DialogTrigger asChild>
            <Button variant="secondary" size="sm" className="gap-2 ml-2 h-8 px-3">
                <Users className="w-3.5 h-3.5"/>
                <span className="text-xs font-medium">Einladen</span>
            </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
            <DialogHeader>
                <DialogTitle>Teilnehmer einladen</DialogTitle>
                <DialogDescription>
                    Lassen Sie andere diesen Code scannen, um der Sitzung beizutreten.
                </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-6 py-6">
                {/* Weißer Hintergrund für Kontrast */}
                <div className="p-4 bg-white rounded-xl shadow-sm border border-border/50">
                    <QRCode
                        value={shareUrl}
                        size={180}
                        style={{height: "auto", maxWidth: "100%", width: "100%"}}
                        viewBox={`0 0 256 256`}
                    />
                </div>

                <div className="w-full space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                        Sitzungs-Link
                    </Label>
                    <div className="flex items-center gap-2">
                        <Input
                            readOnly
                            value={shareUrl}
                            className="font-mono text-xs bg-secondary/50 h-9"
                        />
                        <Button size="icon" variant="outline" onClick={copyToClipboard} className="h-9 w-9 shrink-0">
                            {copied ? <Check className="w-3.5 h-3.5 text-green-500"/> :
                                <Copy className="w-3.5 h-3.5"/>}
                        </Button>
                    </div>
                </div>
            </div>
        </DialogContent>
    </Dialog>;
}
