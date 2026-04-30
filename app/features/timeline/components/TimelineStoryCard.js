import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, Text, Title } from '@mantine/core';
/**
 * A story card that floats into view as the user climbs past its startPoint.
 * `top` is derived from the difference between natural (unscaled) altitude and
 * the card's startPoint so the card appears anchored to its altitude band.
 */
const TimelineStoryCard = ({ story, naturalAltitude }) => {
    const top = naturalAltitude - story.startPoint;
    return (_jsxs(Card, { style: {
            position: 'absolute',
            top,
            left: 0,
            right: 0,
            margin: '0 1rem',
        }, shadow: "sm", radius: "md", withBorder: true, children: [_jsx(Title, { order: 4, mb: 4, children: story.title }), _jsx(Text, { size: "sm", c: "dimmed", children: story.description })] }));
};
export default TimelineStoryCard;
