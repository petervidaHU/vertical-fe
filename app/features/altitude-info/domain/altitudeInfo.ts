export const ALTITUDE_INFO_ICON_OPTIONS = [
  { value: "thermometer", label: "Thermometer", symbol: "🌡" },
  { value: "wind", label: "Wind", symbol: "🌬" },
  { value: "oxygen", label: "Oxygen", symbol: "O2" },
  { value: "droplet", label: "Droplet", symbol: "💧" },
  { value: "sun", label: "Sun", symbol: "☀" },
  { value: "snowflake", label: "Snowflake", symbol: "❄" },
  { value: "gauge", label: "Gauge", symbol: "◔" },
  { value: "leaf", label: "Leaf", symbol: "🍃" },
  { value: "warning", label: "Warning", symbol: "!" },
  { value: "info", label: "Info", symbol: "i" },
] as const;

export type AltitudeInfoIconKey = typeof ALTITUDE_INFO_ICON_OPTIONS[number]["value"];

export type AltitudeInfoValueLike = {
  id: string;
  value: string;
  startPoint: number;
  endPoint: number;
  useGradient: boolean;
  startValue: number | null;
  endValue: number | null;
};

export type AltitudeInfoLike = {
  id: string;
  title: string;
  icon: string;
  order: number;
  values: AltitudeInfoValueLike[];
};

export type ActiveAltitudeInfoItem = {
  id: string;
  title: string;
  icon: AltitudeInfoIconKey;
  order: number;
  value: string;
  valueId: string;
};

export type AltitudeRange = {
  startPoint: number;
  endPoint: number;
};

export function normalizeAltitudeInfoIcon(icon: string | null | undefined): AltitudeInfoIconKey {
  const normalizedIcon = String(icon ?? "").trim().toLowerCase();
  const match = ALTITUDE_INFO_ICON_OPTIONS.find((option) => option.value === normalizedIcon);

  return match?.value ?? "info";
}

export function resolveAltitudeInfoIconSymbol(icon: string | null | undefined): string {
  const normalizedIcon = normalizeAltitudeInfoIcon(icon);
  return ALTITUDE_INFO_ICON_OPTIONS.find((option) => option.value === normalizedIcon)?.symbol ?? "i";
}

export function rangesOverlap(left: AltitudeRange, right: AltitudeRange): boolean {
  return left.startPoint <= right.endPoint && right.startPoint <= left.endPoint;
}

export function calculateGradientValue(
  altitude: number,
  startPoint: number,
  endPoint: number,
  startValue: number,
  endValue: number,
): number {
  const altitudeRange = endPoint - startPoint;
  if (altitudeRange === 0) {
    return startValue;
  }

  const altitude_proportion = (altitude - startPoint) / altitudeRange;
  const valueRange = endValue - startValue;
  const calculatedValue = startValue + altitude_proportion * valueRange;

  return calculatedValue;
}

export function getActiveAltitudeInfoItems(items: AltitudeInfoLike[], altitude: number): ActiveAltitudeInfoItem[] {
  return items
    .map((item) => {
      const activeValue = item.values.find((entry) => altitude >= entry.startPoint && altitude <= entry.endPoint);

      if (!activeValue) {
        return null;
      }

      let displayValue = activeValue.value;

      if (activeValue.useGradient && activeValue.startValue !== null && activeValue.endValue !== null) {
        const calculatedValue = calculateGradientValue(
          altitude,
          activeValue.startPoint,
          activeValue.endPoint,
          activeValue.startValue,
          activeValue.endValue,
        );

        displayValue = calculatedValue.toFixed(2);
      }

      return {
        id: item.id,
        title: item.title,
        icon: normalizeAltitudeInfoIcon(item.icon),
        order: item.order,
        value: displayValue,
        valueId: activeValue.id,
      } satisfies ActiveAltitudeInfoItem;
    })
    .filter((item): item is ActiveAltitudeInfoItem => item !== null)
    .sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order;
      }

      return left.title.localeCompare(right.title);
    });
}