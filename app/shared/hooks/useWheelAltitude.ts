import { useEffect } from 'react';

type NumberRef = {
  current: number;
};

type WheelAltitudeChange = {
  nextScaled: number;
  nextNatural: number;
  deltaY: number;
  event: WheelEvent;
};

type UseWheelAltitudeOptions = {
  pace: number;
  scaledValue?: number;
  naturalValue?: number;
  scaledValueRef?: NumberRef | null;
  naturalValueRef?: NumberRef | null;
  onChange: (change: WheelAltitudeChange) => void;
  minValue?: number;
  enabled?: boolean;
  target?: Document | HTMLElement | Window | null;
};

export const useWheelAltitude = ({
  pace,
  scaledValue,
  naturalValue,
  scaledValueRef,
  naturalValueRef,
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
      const currentScaled = scaledValueRef?.current ?? scaledValue ?? 0;
      const currentNatural = naturalValueRef?.current ?? naturalValue ?? currentScaled;
      const nextScaled = Math.max(minValue, currentScaled + deltaY * pace);
      const nextNatural = Math.max(minValue, currentNatural + deltaY);

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
  }, [enabled, minValue, naturalValue, naturalValueRef, onChange, pace, scaledValue, scaledValueRef, target]);
};
