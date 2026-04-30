import { Card, Text, Title } from '@mantine/core';
import { TimelineItem } from '../domain/types';

type Props = {
  story: TimelineItem;
  naturalAltitude: number;
};

/**
 * A story card that floats into view as the user climbs past its startPoint.
 * `top` is derived from the difference between natural (unscaled) altitude and
 * the card's startPoint so the card appears anchored to its altitude band.
 */
const TimelineStoryCard = ({ story, naturalAltitude }: Props) => {
  const top = naturalAltitude - story.startPoint;
  return (
    <Card
      style={{
        position: 'absolute',
        top,
        left: 0,
        right: 0,
        margin: '0 1rem',
      }}
      shadow="sm"
      radius="md"
      withBorder
    >
      <Title order={4} mb={4}>
        {story.title}
      </Title>
      <Text size="sm" c="dimmed">
        {story.description}
      </Text>
    </Card>
  );
};

export default TimelineStoryCard;
