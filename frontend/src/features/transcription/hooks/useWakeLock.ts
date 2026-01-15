import { useEffect, useRef, useCallback } from "react";

export function useWakeLock(enabled: boolean = true) {
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);

    const requestLock = useCallback(async () => {
        if (!enabled) return;

        if (!('wakeLock' in navigator)) {
            console.warn("Screen Wake Lock API not supported.");
            return;
        }

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

        } catch (err) {
            console.error(`Wake Lock request failed: ${err}`);
        }
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

        // 2. Re-acquire on visibility change
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && enabled) {
                requestLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Cleanup
        return () => {
            releaseLock();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [enabled, requestLock, releaseLock]);
}