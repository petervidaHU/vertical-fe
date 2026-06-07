import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionIcon, Badge, Button, Group, Modal, Paper, ScrollArea, Stack, Text } from "@mantine/core";
import { Link, useLoaderData, useSearchParams } from "react-router";
import { getActiveAltitudeInfoItems } from "../features/altitude-info/domain/altitudeInfo";
import AltitudeInfoIndicators from "../features/timeline/components/AltitudeInfoIndicators";
import JourneyPixiTimelineClient from "../features/timeline/pixi/JourneyPixiTimelineClient";
import { DEFAULT_SCROLL_MULTIPLIER, normalizeScrollMultiplier } from "../features/timeline/domain/scrollMultiplier";
import { normalizeBackgroundPatternConfig } from "../features/timeline/pixi/layout/epicBackgroundPattern";
import { getRecentPassedStories } from "../features/timeline/domain/recentStories";
import { useWheelAltitude } from "../shared/hooks/useWheelAltitude";
import { db } from "../server/db";
import { countTagsPerItem, filterOutByExcludedTags } from "../features/tags/domain/tags";
import { TagFilterButton } from "../shared/components/tags/TagFilterButton";
import { TagFilterModal } from "../shared/components/tags/TagFilterModal";

type JourneyPageData = Awaited<ReturnType<typeof loader>>;
type JourneyStory = JourneyPageData["journey"]["stories"][number];

function formatAltitude(altitude: number): string {
  if (altitude < 1000) return `${Math.round(altitude)} m`;
  return `${(altitude / 1000).toFixed(1)} km`;
}

function getStoryInitials(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "ST";
}

function StoryDetailContent({ story }: { story: JourneyStory }) {
  const storyInitials = getStoryInitials(story.title);

  return (
    <Stack gap="md">
      <Paper
        radius={36}
        p="lg"
        style={{
          border: "1px solid rgba(196, 168, 128, 0.28)",
          background: "linear-gradient(180deg, rgba(255, 250, 240, 0.98) 0%, rgba(246, 235, 210, 0.95) 100%)",
          boxShadow: "0 26px 52px rgba(92, 65, 36, 0.16)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              flexShrink: 0,
              width: 146,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 146,
                height: 146,
                borderRadius: 999,
                overflow: "hidden",
                border: "3px solid rgba(245, 250, 255, 0.98)",
                boxShadow: "inset 0 0 0 2px rgba(179, 209, 233, 0.68), 0 18px 34px rgba(92, 65, 36, 0.14)",
                background: "linear-gradient(180deg, rgba(223, 238, 248, 0.98) 0%, rgba(203, 224, 236, 0.94) 100%)",
                display: "grid",
                placeItems: "center",
              }}
            >
              {story.imageUrl ? (
                <img
                  src={story.imageUrl}
                  alt={story.title}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <span
                  style={{
                    color: "#6a7680",
                    fontFamily: "Trebuchet MS, sans-serif",
                    fontSize: 42,
                    fontWeight: 700,
                  }}
                >
                  {storyInitials}
                </span>
              )}
            </div>
          </div>

          <div style={{ flex: "1 1 320px", minWidth: 0 }}>
            <Stack gap={10}>
              <Group justify="space-between" align="flex-start" wrap="wrap">
                <Text fw={700} size="xl" c="dark" style={{ lineHeight: 1.05 }}>
                  {story.title}
                </Text>
                <Badge
                  variant="light"
                  color={story.storyType === "LINE" ? "grape" : "teal"}
                  style={{ alignSelf: "flex-start" }}
                >
                  {story.storyType === "LINE" ? "Line story" : "Card story"}
                </Badge>
              </Group>

              <Text size="sm" c="dimmed" fw={600}>
                {formatAltitude(story.startPoint)} - {formatAltitude(story.endPoint)}
              </Text>

              {story.storyType === "LINE" ? (
                <Text size="xs" c="dimmed" fw={700}>
                  Label: {story.lineLabel || story.title}
                </Text>
              ) : null}

              <Text size="sm" c="dark" style={{ lineHeight: 1.65 }}>
                {story.description || "No description added yet."}
              </Text>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 74,
                    height: 2,
                    borderRadius: 999,
                    background: "rgba(95, 163, 197, 0.38)",
                  }}
                />
                <Text size="sm" fw={700} c="dark">
                  {formatAltitude(story.startPoint)} -&gt; {formatAltitude(story.endPoint)}
                </Text>
              </div>
            </Stack>
          </div>
        </div>
      </Paper>

      {story.extraContent ? (
        <Paper
          radius={28}
          p="lg"
          style={{
            border: "1px solid rgba(196, 168, 128, 0.2)",
            background: "rgba(255, 249, 239, 0.96)",
            boxShadow: "0 16px 34px rgba(92, 65, 36, 0.08)",
          }}
        >
          <Stack gap="xs">
            <Text size="xs" tt="uppercase" fw={700} c="dimmed" style={{ letterSpacing: "0.06em" }}>
              Additional context
            </Text>
            <ScrollArea.Autosize mah={420}>
              <div
                style={{
                  lineHeight: 1.7,
                  fontSize: 15,
                  color: "#33291f",
                }}
                dangerouslySetInnerHTML={{ __html: story.extraContent }}
              />
            </ScrollArea.Autosize>
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}

export async function loader({ params }: { params: { id?: string } }) {
  if (!params.id) {
    throw new Response("Missing journey id", { status: 400, statusText: "Bad Request" });
  }

  const journey = await db.journey.findUnique({
    where: { id: params.id },
    include: {
      altitudeInfos: {
        orderBy: [{ order: "asc" }, { title: "asc" }],
        include: {
          values: {
            orderBy: { startPoint: "asc" },
          },
          tags: { orderBy: { name: "asc" } },
        },
      },
      epics: {
        orderBy: { startPoint: "asc" },
      },
      stories: {
        orderBy: { startPoint: "asc" },
        include: {
          tags: { orderBy: { name: "asc" } },
        },
      },
      tags: { orderBy: { name: "asc" } },
      _count: {
        select: { epics: true, stories: true },
      },
    },
  });

  if (!journey) {
    throw new Response("Journey not found", { status: 404, statusText: "Not Found" });
  }

  return { journey };
}

export default function JourneyPage() {
  const { journey } = useLoaderData() as Awaited<ReturnType<typeof loader>>;
  const [searchParams, setSearchParams] = useSearchParams();
  const [navOpen, setNavOpen] = useState(false);
  const [scrollMultiplier, setScrollMultiplier] = useState<number>(DEFAULT_SCROLL_MULTIPLIER);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [currentAltitude, setCurrentAltitude] = useState(0);
  const [recentStoriesOpen, setRecentStoriesOpen] = useState(false);
  const [selectedRecentStoryId, setSelectedRecentStoryId] = useState<string | null>(null);
  const [wheelTarget, setWheelTarget] = useState<HTMLDivElement | null>(null);
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const previousEpicIdRef = useRef<string | null>(null);
  const targetAltitudeRef = useRef(0);

  // Tag filtering
  const [tagFilterOpen, setTagFilterOpen] = useState(false);
  const tagFilterStorageKey = useMemo(() => `journey:${journey.id}:tag-filters`, [journey.id]);
  const availableTagIds = useMemo(() => new Set((journey.tags ?? []).map((tag) => tag.id)), [journey.tags]);
  const allTagIds = useMemo(() => (journey.tags ?? []).map((tag) => tag.id), [journey.tags]);
  const rawTagsParam = searchParams.get("tags"); // null = no param (default all), "" = empty (all deselected)
  const enabledTagIds = useMemo(() => {
    if (rawTagsParam === null) {
      return allTagIds; // default: all tags selected
    }
    if (rawTagsParam === "") {
      return []; // explicitly deselected all
    }

    return rawTagsParam
      .split(",")
      .map((tagId) => tagId.trim())
      .filter((tagId, index, tagIds) => tagId.length > 0 && availableTagIds.has(tagId) && tagIds.indexOf(tagId) === index);
  }, [allTagIds, availableTagIds, rawTagsParam]);

  const applyEnabledTagIds = useCallback(
    (nextTagIds: string[]) => {
      const normalizedTagIds = Array.from(new Set(nextTagIds)).filter((tagId) => availableTagIds.has(tagId));
      const params = new URLSearchParams(searchParams);

      if (normalizedTagIds.length === 0) {
        params.set("tags", ""); // all deselected
      } else if (normalizedTagIds.length < allTagIds.length) {
        params.set("tags", normalizedTagIds.join(",")); // subset selected
      } else {
        params.delete("tags"); // all selected → clean URL
      }

      setSearchParams(params, { replace: true });
    },
    [allTagIds, availableTagIds, searchParams, setSearchParams],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (enabledTagIds.length === allTagIds.length) {
      window.sessionStorage.removeItem(tagFilterStorageKey);
    } else {
      window.sessionStorage.setItem(tagFilterStorageKey, enabledTagIds.join(","));
    }
  }, [enabledTagIds, allTagIds, tagFilterStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || rawTagsParam !== null) {
      return;
    }

    const persistedValue = window.sessionStorage.getItem(tagFilterStorageKey);
    if (persistedValue === null) {
      return;
    }

    if (persistedValue === "") {
      applyEnabledTagIds([]);
      return;
    }

    const persistedTagIds = persistedValue
      .split(",")
      .map((tagId) => tagId.trim())
      .filter((tagId, index, tagIds) => tagId.length > 0 && availableTagIds.has(tagId) && tagIds.indexOf(tagId) === index);

    if (persistedTagIds.length > 0) {
      applyEnabledTagIds(persistedTagIds);
    }
  }, [applyEnabledTagIds, availableTagIds, rawTagsParam, tagFilterStorageKey]);

  // Filtered data
  const filteredStories = useMemo(
    () => filterOutByExcludedTags(journey.stories, enabledTagIds, allTagIds),
    [journey.stories, enabledTagIds, allTagIds],
  );

  const filteredAltitudeInfos = useMemo(
    () => filterOutByExcludedTags(journey.altitudeInfos, enabledTagIds, allTagIds),
    [journey.altitudeInfos, enabledTagIds, allTagIds],
  );
  const storyTagCounts = useMemo(
    () => countTagsPerItem(journey.stories, journey.tags ?? []),
    [journey.stories, journey.tags],
  );
  const altitudeInfoTagCounts = useMemo(
    () => countTagsPerItem(journey.altitudeInfos, journey.tags ?? []),
    [journey.altitudeInfos, journey.tags],
  );
  const noFilteredContent = enabledTagIds.length < allTagIds.length && filteredStories.length === 0 && filteredAltitudeInfos.length === 0;

  const selectedStory = filteredStories.find((story) => story.id === selectedStoryId) ?? null;
  const timelineEpics = useMemo(
    () => journey.epics.map((epic) => ({
      ...epic,
      backgroundPatternConfig: normalizeBackgroundPatternConfig(epic.backgroundPatternConfig),
    })),
    [journey.epics],
  );
  const journeyMaxAltitude = Math.max(
    journey.stories.reduce((max, story) => Math.max(max, story.endPoint), 0),
    timelineEpics.reduce((max, epic) => Math.max(max, epic.endPoint), 0),
    journey.altitudeInfos.reduce(
      (max, altitudeInfo) => Math.max(
        max,
        altitudeInfo.values.reduce((valueMax, entry) => Math.max(valueMax, entry.endPoint), 0),
      ),
      0,
    ),
  );
  const activeAltitudeInfos = useMemo(
    () => getActiveAltitudeInfoItems(filteredAltitudeInfos, currentAltitude),
    [currentAltitude, filteredAltitudeInfos],
  );

  const handleStoryCardClick = useCallback((story: { id: string }) => {
    setSelectedStoryId(story.id);
  }, []);

  const handleWheelTargetRef = useCallback((node: HTMLDivElement | null) => {
    setWheelTarget(node);
  }, []);

  const handleRenderedAltitudeChange = useCallback((altitude: number) => {
    startTransition(() => {
      setCurrentAltitude((previousAltitude) => (previousAltitude === altitude ? previousAltitude : altitude));
    });
  }, []);

  const handleAltitudeChange = useCallback(
    ({ nextScaled }: { nextScaled: number }) => {
      targetAltitudeRef.current = Math.max(0, Math.min(journeyMaxAltitude, nextScaled));
    },
    [journeyMaxAltitude],
  );

  const recentPassedStories = useMemo(
    () => getRecentPassedStories(filteredStories, currentAltitude, 10),
    [currentAltitude, filteredStories],
  );

  const selectedRecentStory = recentPassedStories.find((story) => story.id === selectedRecentStoryId) ?? null;
  const selectedEpic = journey.epics.find((epic) => epic.id === selectedEpicId) ?? null;

  useEffect(() => {
    if (selectedRecentStoryId && !selectedRecentStory) {
      setSelectedRecentStoryId(null);
    }
  }, [selectedRecentStory, selectedRecentStoryId]);

  // Detect when entering a new epic and show modal
  useEffect(() => {
    const currentEpic = timelineEpics.find(
      (epic) => currentAltitude >= epic.startPoint && currentAltitude <= epic.endPoint,
    );
    const currentEpicId = currentEpic?.id ?? null;

    if (currentEpicId && currentEpicId !== previousEpicIdRef.current) {
      previousEpicIdRef.current = currentEpicId;
      setSelectedEpicId(currentEpicId);
    }
  }, [currentAltitude, timelineEpics]);

  const closeRecentStoriesModal = useCallback(() => {
    setRecentStoriesOpen(false);
    setSelectedRecentStoryId(null);
  }, []);

  const handleScrollMultiplierChange = useCallback((nextMultiplier: number) => {
    const normalizedMultiplier = normalizeScrollMultiplier(nextMultiplier);

    setScrollMultiplier((previousMultiplier: number) => (
      previousMultiplier === normalizedMultiplier ? previousMultiplier : normalizedMultiplier
    ));
  }, []);

  useWheelAltitude({
    pace: scrollMultiplier,
    scaledValueRef: targetAltitudeRef,
    naturalValueRef: targetAltitudeRef,
    onChange: handleAltitudeChange,
    enabled: wheelTarget !== null,
    target: wheelTarget,
  });

  return (
    <>
      {/* Suppress body scrollbar for full-screen canvas page */}
      <style>{`html, body { overflow: hidden; margin: 0; padding: 0; }`}</style>

      {/* Full-screen canvas layer */}
      <div ref={handleWheelTargetRef} style={{ position: "fixed", inset: 0 }}>
        <JourneyPixiTimelineClient
          epics={timelineEpics}
          stories={filteredStories}
          startGround={journey.startingPoint}
          targetAltitudeRef={targetAltitudeRef}
          scrollMultiplier={scrollMultiplier}
          onStoryCardClick={handleStoryCardClick}
          onScrollMultiplierChange={handleScrollMultiplierChange}
          onRenderedAltitudeChange={handleRenderedAltitudeChange}
        />
      </div>

      <AltitudeInfoIndicators items={activeAltitudeInfos} />

      {noFilteredContent ? (
        <Paper
          radius="xl"
          p="sm"
          style={{
            position: "fixed",
            top: 18,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1001,
            border: "1px solid rgba(196, 168, 128, 0.28)",
            background: "rgba(255, 250, 240, 0.96)",
            boxShadow: "0 14px 30px rgba(92, 65, 36, 0.12)",
          }}
        >
          <Group gap="sm" wrap="nowrap">
            <Text size="sm" c="dark">
              No stories or altitude info match the selected tags.
            </Text>
            <Button size="xs" variant="light" onClick={() => applyEnabledTagIds(allTagIds)}>
              Clear filters
            </Button>
          </Group>
        </Paper>
      ) : null}

      <TagFilterButton
        activeCount={allTagIds.length - enabledTagIds.length}
        onClick={() => setTagFilterOpen(true)}
      />

      <TagFilterModal
        opened={tagFilterOpen}
        onClose={() => setTagFilterOpen(false)}
        allTags={journey.tags ?? []}
        enabledTagIds={enabledTagIds}
        onApply={applyEnabledTagIds}
        storyCounts={storyTagCounts}
        altitudeInfoCounts={altitudeInfoTagCounts}
      />

      <Modal
        opened={selectedStory !== null}
        onClose={() => setSelectedStoryId(null)}
        title={selectedStory?.title ?? "Story details"}
        size="lg"
        centered
      >
        {selectedStory ? <StoryDetailContent story={selectedStory} /> : null}
      </Modal>

      <Modal
        opened={selectedEpic !== null}
        onClose={() => setSelectedEpicId(null)}
        title={selectedEpic?.title ?? "Epic layer"}
        size="lg"
        centered
      >
        {selectedEpic ? (
          <Stack gap="md">
            <Paper
              radius={36}
              p="lg"
              style={{
                border: "1px solid rgba(196, 168, 128, 0.28)",
                background: "linear-gradient(180deg, rgba(255, 250, 240, 0.98) 0%, rgba(246, 235, 210, 0.95) 100%)",
                boxShadow: "0 26px 52px rgba(92, 65, 36, 0.16)",
              }}
            >
              {selectedEpic.description && (
                <Text size="sm" c="dark" lh={1.6}>
                  {selectedEpic.description}
                </Text>
              )}
              {!selectedEpic.description && (
                <Text size="sm" c="dimmed">
                  No description for this epic layer yet.
                </Text>
              )}
            </Paper>
          </Stack>
        ) : null}
      </Modal>

      <Modal
        opened={recentStoriesOpen}
        onClose={closeRecentStoriesModal}
        title={selectedRecentStory ? (
          <Group gap="xs" wrap="nowrap">
            <ActionIcon
              variant="subtle"
              color="gray"
              aria-label="Back to recent stories"
              onClick={() => setSelectedRecentStoryId(null)}
            >
              <span style={{ fontFamily: "monospace", fontSize: 18 }}>←</span>
            </ActionIcon>

            <div>
              <Text fw={700}>{selectedRecentStory.title}</Text>
              <Text size="xs" c="dimmed">Recent stories</Text>
            </div>
          </Group>
        ) : (
          <Group gap="xs">
            <Text fw={700}>Recent stories</Text>
            <Badge variant="light" color="teal">{recentPassedStories.length}</Badge>
          </Group>
        )}
        size="xl"
        centered
      >
        {selectedRecentStory ? (
          <StoryDetailContent story={selectedRecentStory} />
        ) : recentPassedStories.length > 0 ? (
          <ScrollArea.Autosize mah={500}>
            <Stack gap="sm">
              {recentPassedStories.map((story) => (
                <Paper
                  key={story.id}
                  component="button"
                  type="button"
                  radius="md"
                  p="md"
                  onClick={() => setSelectedRecentStoryId(story.id)}
                  style={{
                    width: "100%",
                    cursor: "pointer",
                    textAlign: "left",
                    border: "1px solid rgba(181, 149, 108, 0.22)",
                    background: "linear-gradient(180deg, rgba(255, 249, 238, 0.98) 0%, rgba(249, 237, 212, 0.96) 100%)",
                    transition: "transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease",
                    boxShadow: "0 18px 34px rgba(92, 65, 36, 0.12)",
                  }}
                >
                  <Stack gap={8}>
                    <Group justify="space-between" align="flex-start">
                      <Text fw={700} size="md" c="dark">
                        {story.title}
                      </Text>
                      <Group gap={6}>
                        <Badge variant="light" color={story.storyType === "LINE" ? "grape" : "teal"}>
                          {story.storyType === "LINE" ? "Line" : "Card"}
                        </Badge>
                        <Badge variant="light" color="teal">Passed</Badge>
                      </Group>
                    </Group>

                    <Text size="xs" c="dimmed">
                      Ended at {formatAltitude(story.endPoint)}
                    </Text>

                    {story.imageUrl ? (
                      <img
                        src={story.imageUrl}
                        alt={story.title}
                        style={{
                          width: "100%",
                          maxHeight: 120,
                          objectFit: "cover",
                          borderRadius: 12,
                          border: "1px solid rgba(181, 149, 108, 0.18)",
                        }}
                      />
                    ) : null}

                    {story.storyType === "LINE" ? (
                      <Text size="xs" c="dimmed">
                        Label: {story.lineLabel || story.title}
                      </Text>
                    ) : null}

                    <Text size="sm" c="dark" lineClamp={2}>
                      {story.description || "No description added yet."}
                    </Text>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </ScrollArea.Autosize>
        ) : (
          <Text c="dimmed">You have not passed any stories yet.</Text>
        )}
      </Modal>

      {recentPassedStories.length > 0 ? (
        <button
          type="button"
          aria-label="Open recent stories"
          onClick={() => {
            setRecentStoriesOpen(true);
          }}
          style={{
            appearance: "none",
            position: "fixed",
            left: "50%",
            bottom: 18,
            zIndex: 1000,
            padding: "10px 24px",
            transform: "translateX(-50%)",
            borderRadius: 999,
            border: "1px solid rgba(186, 155, 114, 0.24)",
            background: "linear-gradient(180deg, rgba(255, 250, 240, 0.98) 0%, rgba(248, 236, 208, 0.96) 100%)",
            boxShadow: "0 14px 26px rgba(92, 65, 36, 0.16)",
            backdropFilter: "blur(14px)",
            cursor: "pointer",
            opacity: 0.3,
            transition: "opacity 200ms ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.3"; }}
          onFocus={(e) => { e.currentTarget.style.opacity = "1"; }}
          onBlur={(e) => { e.currentTarget.style.opacity = "0.3"; }}
        >
          <span
            style={{
              color: "#7a6549",
              fontFamily: "Avenir Next, Trebuchet MS, sans-serif",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            Recent stories
          </span>
        </button>
      ) : null}

      {/* Slide-down nav tab */}
      <div
        style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000 }}
        onMouseEnter={() => setNavOpen(true)}
        onMouseLeave={() => setNavOpen(false)}
      >
        {/* Always-visible pill handle */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            style={{
              width: 48,
              height: 5,
              background: navOpen
                ? "rgba(174, 197, 216, 0.65)"
                : "rgba(174, 197, 216, 0.28)",
              borderRadius: "0 0 6px 6px",
              transition: "background 0.25s",
              cursor: "default",
            }}
          />
        </div>

        {/* Nav panel — expands downward on hover */}
        <div
          style={{
            overflow: "hidden",
            maxHeight: navOpen ? "80px" : "0",
            transition: "max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
            background: "rgba(7, 17, 29, 0.92)",
            backdropFilter: "blur(14px)",
            borderBottom: "1px solid rgba(42, 70, 98, 0.45)",
          }}
        >
          <div
            style={{
              padding: "12px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  color: "#f5f7fa",
                  fontFamily: "monospace",
                  fontSize: 15,
                  fontWeight: 700,
                  lineHeight: 1.3,
                }}
              >
                {journey.name}
              </div>
              <div
                style={{
                  color: "#8ba4b8",
                  fontFamily: "monospace",
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                {journey._count.epics} epics • {journey._count.stories} stories
              </div>
            </div>

            <Group gap="xs">
              <Button
                component={Link}
                to="/journey"
                variant="subtle"
                size="xs"
                color="gray"
              >
                Back to journeys
              </Button>
              <Button
                component={Link}
                to={`/admin/${journey.id}`}
                variant="subtle"
                size="xs"
                color="teal"
              >
                Manage data
              </Button>
            </Group>
          </div>
        </div>
      </div>
    </>
  );
}
