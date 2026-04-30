import { useEffect } from 'react';
export const useWheelAltitude = ({ pace, scaledValue, naturalValue, onChange, minValue = 0, enabled = true, target, }) => {
    useEffect(() => {
        if (!enabled) {
            return;
        }
        const eventTarget = target ?? document;
        const handleWheel = (event) => {
            if (event.cancelable) {
                event.preventDefault();
            }
            const deltaY = -event.deltaY;
            const nextScaled = Math.max(minValue, scaledValue + deltaY * pace);
            const nextNatural = Math.max(minValue, naturalValue + deltaY);
            onChange({
                nextScaled,
                nextNatural,
                deltaY,
                event,
            });
        };
        eventTarget.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            eventTarget.removeEventListener('wheel', handleWheel);
        };
    }, [enabled, minValue, naturalValue, onChange, pace, scaledValue, target]);
};
