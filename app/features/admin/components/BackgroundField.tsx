import { ActionIcon, Box, Button, Group, SegmentedControl, Stack, Text, TextInput } from "@mantine/core";
import { useMemo, useState } from "react";
import {
  BackgroundValue,
  backgroundToCss,
  defaultColorBackground,
  getDefaultGradientFromColor,
  parseStoredBackground,
  serializeBackground,
} from "../../../shared/domain/background";
import ColorPickerDialog from "./ColorPickerDialog";

type BackgroundFieldProps = {
  name: string;
  label: string;
  defaultValue?: string;
  defaultColor: string;
  allowGradient?: boolean;
};

export default function BackgroundField({
  name,
  label,
  defaultValue,
  defaultColor,
  allowGradient = true,
}: BackgroundFieldProps) {
  const initialValue = useMemo(() => {
    const parsed = parseStoredBackground(defaultValue, defaultColor);
    if (!allowGradient && parsed.mode === "gradient") {
      return defaultColorBackground(parsed.stops[0]?.color ?? defaultColor);
    }
    return parsed;
  }, [allowGradient, defaultColor, defaultValue]);

  const [background, setBackground] = useState<BackgroundValue>(initialValue);

  const serialized = serializeBackground(background);
  const previewCss = backgroundToCss(background);

  const gradientStops = background.mode === "gradient" ? background.stops : [];

  return (
    <Stack gap="xs">
      <Text fw={500} size="sm">{label}</Text>

      {allowGradient ? (
        <SegmentedControl
          value={background.mode}
          data={[
            { value: "color", label: "Color" },
            { value: "gradient", label: "Gradient" },
          ]}
          onChange={(mode) => {
            if (mode === "color") {
              const fallback = background.mode === "color"
                ? background.color
                : background.stops[0]?.color ?? defaultColor;
              setBackground(defaultColorBackground(fallback));
              return;
            }

            const sourceColor = background.mode === "color"
              ? background.color
              : background.stops[0]?.color ?? defaultColor;
            setBackground(getDefaultGradientFromColor(sourceColor));
          }}
        />
      ) : null}

      {background.mode === "color" ? (
        <ColorPickerDialog
          value={background.color}
          onChange={(value) => setBackground({ mode: "color", color: value })}
          label="Pick color"
        />
      ) : (
        <Stack gap="xs">
          {gradientStops.map((stop, index) => (
            <Group key={`${stop.color}-${stop.percentage}-${index}`} align="end" wrap="nowrap">
              <ColorPickerDialog
                value={stop.color}
                label={`Stop ${index + 1} color`}
                onChange={(value) => {
                  setBackground((previous) => {
                    if (previous.mode !== "gradient") return previous;
                    const nextStops = previous.stops.map((item, stopIndex) => (
                      stopIndex === index ? { ...item, color: value } : item
                    ));
                    return { ...previous, stops: nextStops };
                  });
                }}
              />
              <TextInput
                label="%"
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                step={1}
                value={String(Math.round(stop.percentage))}
                onChange={(event) => {
                  const nextValue = Number.parseFloat(event.currentTarget.value);
                  setBackground((previous) => {
                    if (previous.mode !== "gradient") return previous;
                    const nextStops = previous.stops.map((item, stopIndex) => {
                      if (stopIndex !== index) return item;
                      return {
                        ...item,
                        percentage: Number.isFinite(nextValue)
                          ? Math.max(0, Math.min(100, nextValue))
                          : item.percentage,
                      };
                    });
                    return { ...previous, stops: nextStops };
                  });
                }}
              />
              <ActionIcon
                variant="light"
                color="red"
                disabled={gradientStops.length <= 2}
                onClick={() => {
                  setBackground((previous) => {
                    if (previous.mode !== "gradient") return previous;
                    if (previous.stops.length <= 2) return previous;
                    return {
                      ...previous,
                      stops: previous.stops.filter((_, stopIndex) => stopIndex !== index),
                    };
                  });
                }}
              >
                x
              </ActionIcon>
            </Group>
          ))}

          <Button
            variant="light"
            size="xs"
            onClick={() => {
              setBackground((previous) => {
                if (previous.mode !== "gradient") return previous;
                const nextPercentage = previous.stops.length > 0
                  ? Math.min(100, previous.stops[previous.stops.length - 1].percentage + 10)
                  : 100;
                return {
                  ...previous,
                  stops: [
                    ...previous.stops,
                    { color: previous.stops[previous.stops.length - 1]?.color ?? defaultColor, percentage: nextPercentage },
                  ],
                };
              });
            }}
          >
            Add stop
          </Button>

          <Text size="xs" c="dimmed">
            Gradient preview feedback with stop percentages:
            {gradientStops
              .map((stop) => ` ${Math.round(stop.percentage)}% ${stop.color}`)
              .join(" |")}.
          </Text>
        </Stack>
      )}

      <Box
        style={{
          height: 28,
          borderRadius: 8,
          border: "1px solid rgba(140, 140, 140, 0.5)",
          background: previewCss,
        }}
      />

      <input type="hidden" name={name} value={serialized} />
    </Stack>
  );
}
