import { useEffect, useRef, useCallback } from "react";

export function useWakeLock(enabled: boolean = true) {
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);

    const requestLock = useCallback(async () => {
        // Wir definieren die Logik in einer internen Funktion,
        // damit wir sie rekursiv im Error-Handler aufrufen können.
        const executeLock = async () => {
            if (!enabled) return;

            // Feature Detection
            if (!('wakeLock' in navigator)) return;

            try {
                if (wakeLockRef.current !== null && !wakeLockRef.current.released) {
                    return;
                }

                const lock = await navigator.wakeLock.request('screen');
                wakeLockRef.current = lock;
                console.log("Wake Lock active");

                lock.addEventListener('release', () => {
                    console.log('Wake Lock released');
                });

            } catch (err: any) {
                console.warn(`Wake Lock request failed: ${err.name}`);

                // FIX FOR IOS SAFARI (NotAllowedError):
                if (err.name === 'NotAllowedError') {
                    const retryOnInteraction = () => {
                        executeLock();

                        document.removeEventListener('click', retryOnInteraction);
                        document.removeEventListener('touchstart', retryOnInteraction);
                    };

                    document.addEventListener('click', retryOnInteraction);
                    document.addEventListener('touchstart', retryOnInteraction);
                }
            }
        };

        // Starten der Logik
        await executeLock();
    }, [enabled]);

    const releaseLock = useCallback(async () => {
        if (wakeLockRef.current) {
            try {
                await wakeLockRef.current.release();
                wakeLockRef.current = null;
            } catch (err) {
                console.error(`Wake Lock release failed: ${err}`);
            }
        }
    }, []);

    useEffect(() => {
        if (enabled) {
            requestLock();
        } else {
            releaseLock();
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && enabled) {
                requestLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            releaseLock();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [enabled, requestLock, releaseLock]);
}