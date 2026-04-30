import { useEffect } from 'react';

type WheelAltitudeChange = {
  nextScaled: number;
  nextNatural: number;
  deltaY: number;
  event: WheelEvent;
};

type UseWheelAltitudeOptions = {
  pace: number;
  scaledValue: number;
  naturalValue: number;
  onChange: (change: WheelAltitudeChange) => void;
  minValue?: number;
  enabled?: boolean;
  target?: Document | HTMLElement | Window | null;
};

export const useWheelAltitude = ({
  pace,
  scaledValue,
  naturalValue,
  onChange,
  minValue = 0,
  enabled = true,
  target,
}: UseWheelAltitudeOptions) => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const eventTarget = target ?? document;

    const handleWheel = (event: WheelEvent) => {
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

    eventTarget.addEventListener('wheel', handleWheel as EventListener, { passive: false });

    return () => {
      eventTarget.removeEventListener('wheel', handleWheel as EventListener);
    };
  }, [enabled, minValue, naturalValue, onChange, pace, scaledValue, target]);
};
