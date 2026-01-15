import { AlertCircle, Cloud, Activity, TestTube } from "lucide-react";
import type {ProviderType} from "../types";

interface StatusBadgeProps {
    provider: ProviderType;
    error: string | null;
}

export function StatusBadge({ provider, error }: StatusBadgeProps) {

    // 1. Error Priority: If there is an error, show it immediately
    if (error) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/15 text-red-600 border border-red-500/20">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="text-xs font-medium max-w-[200px] truncate" title={error}>
                    {error}
                </span>
            </div>
        );
    }

    // 2. Configuration for each provider
    const config = {
        azure: {
            icon: Cloud,
            label: "Azure Speech",
            color: "text-blue-600 bg-blue-500/10 border-blue-200/50"
        },
        deepgram: {
            icon: Activity,
            label: "Deepgram Nova-3",
            color: "text-green-600 bg-green-500/10 border-green-200/50"
        },
        mock: {
            icon: TestTube,
            label: "Mock Stream",
            color: "text-orange-600 bg-orange-500/10 border-orange-200/50"
        }
    };

    const activeConfig = config[provider];
    const Icon = activeConfig.icon;

    // 3. Render Normal State
    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${activeConfig.color}`}>
            <Icon className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">
                {activeConfig.label}
            </span>
        </div>
    );
}