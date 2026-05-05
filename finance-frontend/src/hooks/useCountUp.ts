import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number from 0 to `target` using an ease-out cubic curve.
 * Re-triggers whenever `target` changes.
 */
export function useCountUp(target: number, duration = 900): number {
    const [value, setValue] = useState(0);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

        const startTime = performance.now();

        const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(target * eased);

            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate);
            } else {
                setValue(target);
                rafRef.current = null;
            }
        };

        rafRef.current = requestAnimationFrame(animate);
        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
    }, [target, duration]);

    return value;
}
