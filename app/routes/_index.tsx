import { Alert, Box, Loader, Stack, Text } from "@mantine/core";
import TimelineAltitudeDisplay from "../features/timeline/components/TimelineAltitudeDisplay";
import TimelineEpicBadge from "../features/timeline/components/TimelineEpicBadge";
import TimelineStoryCard from "../features/timeline/components/TimelineStoryCard";
import { useTimelineScroll } from "../features/timeline/services/useTimelineScroll";

const IndexRoute = () => {
  const {
    altitude,
    naturalAltitude,
    pace,
    setPace,
    storiesVisible,
    epicsVisible,
    isLoading,
    error,
  } = useTimelineScroll();

  return (
    <Box
      style={{
        display: "flex",
        height: "calc(100vh - 80px)",
        overflow: "hidden",
        position: "relative",
        background: "linear-gradient(to bottom, #1a1a2e 0%, #16213e 40%, #0f3460 100%)",
        borderRadius: 8,
      }}
    >
      {/* Story cards column — scrolls with altitude */}
      <Box style={{ flex: "1 1 60%", position: "relative", overflow: "hidden" }}>
        {storiesVisible.map((story) => (
          <TimelineStoryCard
            key={story.id}
            story={story}
            naturalAltitude={naturalAltitude}
          />
        ))}
        {storiesVisible.length === 0 && !isLoading && (
          <Box style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}>
            <Text c="dimmed" size="sm">
              Scroll up to gain altitude
            </Text>
          </Box>
        )}
      </Box>

      {/* Right panel — altitude + epics */}
      <Box
        style={{
          flex: "0 0 280px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "1rem",
          borderLeft: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <TimelineAltitudeDisplay
          altitude={altitude}
          pace={pace}
          onPaceChange={setPace}
        />

        <Stack gap="sm" style={{ flex: 1, marginTop: "2rem", overflow: "auto" }}>
          {epicsVisible.map((epic) => (
            <TimelineEpicBadge key={epic.id} epic={epic} altitude={altitude} />
          ))}
          {epicsVisible.length === 0 && (
            <Text c="dimmed" size="xs">
              No active epic at this altitude
            </Text>
          )}
        </Stack>

        {isLoading && (
          <Box style={{ display: "flex", justifyContent: "center", padding: "0.5rem" }}>
            <Loader size="xs" color="teal" />
          </Box>
        )}
      </Box>

      {error && (
        <Alert
          color="red"
          title="Load error"
          style={{ position: "absolute", bottom: 16, left: 16, right: 16 }}
        >
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default IndexRoute;

