import { Group, Stack, Text, Title } from '@mantine/core';

type Props = {
  altitude: number;
  pace: number;
  onPaceChange: (pace: number) => void;
};

const formatAltitude = (altitude: number): string => {
  if (altitude < 1000) return `${Math.round(altitude)} m`;
  return `${(altitude / 1000).toFixed(1)} km`;
};

/**
 * Displays current altitude with unit formatting and pace controls.
 * Wheel scrolling increases altitude (meters → km → higher) as the user
 * "flies" through the content sky.
 */
const TimelineAltitudeDisplay = ({ altitude, pace, onPaceChange }: Props) => {
  return (
    <Stack gap={4} align="flex-end">
      <Title order={2} ff="monospace">
        {formatAltitude(altitude)}
      </Title>
      <Text size="xs" c="dimmed">
        altitude
      </Text>
      <Group mt={4} gap={4}>
        <Text size="xs" c="dimmed">
          pace:
        </Text>
        <button
          onClick={() => onPaceChange(Math.max(1, pace / 10))}
          style={{ cursor: 'pointer', padding: '2px 8px', fontSize: 12 }}
          disabled={pace <= 1}
        >
          ÷10
        </button>
        <Text size="xs" ff="monospace">
          ×{pace}
        </Text>
        <button
          onClick={() => onPaceChange(pace * 10)}
          style={{ cursor: 'pointer', padding: '2px 8px', fontSize: 12 }}
        >
          ×10
        </button>
      </Group>
    </Stack>
  );
};

export default TimelineAltitudeDisplay;
