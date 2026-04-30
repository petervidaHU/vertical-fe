import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Group, Stack, Text, Title } from '@mantine/core';
const formatAltitude = (altitude) => {
    if (altitude < 1000)
        return `${Math.round(altitude)} m`;
    return `${(altitude / 1000).toFixed(1)} km`;
};
/**
 * Displays current altitude with unit formatting and pace controls.
 * Wheel scrolling increases altitude (meters → km → higher) as the user
 * "flies" through the content sky.
 */
const TimelineAltitudeDisplay = ({ altitude, pace, onPaceChange }) => {
    return (_jsxs(Stack, { gap: 4, align: "flex-end", children: [_jsx(Title, { order: 2, ff: "monospace", children: formatAltitude(altitude) }), _jsx(Text, { size: "xs", c: "dimmed", children: "altitude" }), _jsxs(Group, { mt: 4, gap: 4, children: [_jsx(Text, { size: "xs", c: "dimmed", children: "pace:" }), _jsx("button", { onClick: () => onPaceChange(Math.max(1, pace / 10)), style: { cursor: 'pointer', padding: '2px 8px', fontSize: 12 }, disabled: pace <= 1, children: "\u00F710" }), _jsxs(Text, { size: "xs", ff: "monospace", children: ["\u00D7", pace] }), _jsx("button", { onClick: () => onPaceChange(pace * 10), style: { cursor: 'pointer', padding: '2px 8px', fontSize: 12 }, children: "\u00D710" })] })] }));
};
export default TimelineAltitudeDisplay;
