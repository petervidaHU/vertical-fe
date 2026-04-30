import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Badge, Group, Progress, Stack, Text } from '@mantine/core';
/**
 * Shows an epic's title and progress through it based on the current altitude.
 * Progress is clamped 0–100 so it stays clean at the boundaries.
 */
const TimelineEpicBadge = ({ epic, altitude }) => {
    const span = epic.endPoint - epic.startPoint;
    const progress = span > 0
        ? Math.min(100, Math.max(0, Math.round(((altitude - epic.startPoint) / span) * 100)))
        : 0;
    return (_jsxs(Stack, { gap: 4, children: [_jsxs(Group, { justify: "space-between", children: [_jsx(Badge, { color: "teal", variant: "light", children: epic.title }), _jsxs(Text, { size: "xs", c: "dimmed", children: [progress, "%"] })] }), _jsx(Progress, { value: progress, size: "xs", color: "teal" })] }));
};
export default TimelineEpicBadge;
