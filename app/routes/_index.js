import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Box, Loader, Stack, Text } from "@mantine/core";
import TimelineAltitudeDisplay from "../features/timeline/components/TimelineAltitudeDisplay";
import TimelineEpicBadge from "../features/timeline/components/TimelineEpicBadge";
import TimelineStoryCard from "../features/timeline/components/TimelineStoryCard";
import { useTimelineScroll } from "../features/timeline/services/useTimelineScroll";
const IndexRoute = () => {
    const { altitude, naturalAltitude, pace, setPace, storiesVisible, epicsVisible, isLoading, error, } = useTimelineScroll();
    return (_jsxs(Box, { style: {
            display: "flex",
            height: "calc(100vh - 80px)",
            overflow: "hidden",
            position: "relative",
            background: "linear-gradient(to bottom, #1a1a2e 0%, #16213e 40%, #0f3460 100%)",
            borderRadius: 8,
        }, children: [_jsxs(Box, { style: { flex: "1 1 60%", position: "relative", overflow: "hidden" }, children: [storiesVisible.map((story) => (_jsx(TimelineStoryCard, { story: story, naturalAltitude: naturalAltitude }, story.id))), storiesVisible.length === 0 && !isLoading && (_jsx(Box, { style: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }, children: _jsx(Text, { c: "dimmed", size: "sm", children: "Scroll up to gain altitude" }) }))] }), _jsxs(Box, { style: {
                    flex: "0 0 280px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "1rem",
                    borderLeft: "1px solid rgba(255,255,255,0.1)",
                }, children: [_jsx(TimelineAltitudeDisplay, { altitude: altitude, pace: pace, onPaceChange: setPace }), _jsxs(Stack, { gap: "sm", style: { flex: 1, marginTop: "2rem", overflow: "auto" }, children: [epicsVisible.map((epic) => (_jsx(TimelineEpicBadge, { epic: epic, altitude: altitude }, epic.id))), epicsVisible.length === 0 && (_jsx(Text, { c: "dimmed", size: "xs", children: "No active epic at this altitude" }))] }), isLoading && (_jsx(Box, { style: { display: "flex", justifyContent: "center", padding: "0.5rem" }, children: _jsx(Loader, { size: "xs", color: "teal" }) }))] }), error && (_jsx(Alert, { color: "red", title: "Load error", style: { position: "absolute", bottom: 16, left: 16, right: 16 }, children: error }))] }));
};
export default IndexRoute;
