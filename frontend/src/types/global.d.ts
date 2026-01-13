export {};

declare global {
    interface Window {
        TOLKA_CONFIG?: {
            WS_TOKEN: string;
        };
    }
}