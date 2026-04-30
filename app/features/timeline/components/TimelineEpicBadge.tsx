import { Badge, Group, Progress, Stack, Text } from '@mantine/core';
import { TimelineItem } from '../domain/types';

type Props = {
  epic: TimelineItem;
  altitude: number;
};

/**
 * Shows an epic's title and progress through it based on the current altitude.
 * Progress is clamped 0–100 so it stays clean at the boundaries.
 */
const TimelineEpicBadge = ({ epic, altitude }: Props) => {
  const span = epic.endPoint - epic.startPoint;
  const progress = span > 0
    ? Math.min(100, Math.max(0, Math.round(((altitude - epic.startPoint) / span) * 100)))
    : 0;

  return (
    <Stack gap={4}>
      <Group justify="space-between">
        <Badge color="teal" variant="light">
          {epic.title}
        </Badge>
        <Text size="xs" c="dimmed">
          {progress}%
        </Text>
      </Group>
      <Progress value={progress} size="xs" color="teal" />
    </Stack>
  );
};

export default TimelineEpicBadge;
