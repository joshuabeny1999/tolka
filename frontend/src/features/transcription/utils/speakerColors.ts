const SPEAKER_COLORS = [
    "text-emerald-400",
    "text-blue-400",
    "text-amber-400",
    "text-violet-400",
    "text-pink-400",
    "text-cyan-400",
    "text-lime-400",
    "text-fuchsia-400",
];

export function getSpeakerColor(speakerId: string | null | undefined): string {
    if (!speakerId || speakerId === 'Unknown') {
        return "text-foreground";
    }

    let hash = 0;
    for (let i = 0; i < speakerId.length; i++) {
        hash = speakerId.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % SPEAKER_COLORS.length;
    return SPEAKER_COLORS[index];
}

export function formatSpeakerName(speaker: string | null | undefined): string {
    if (!speaker || speaker === 'Unknown') return '';
    return speaker;
}