import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Group, Modal, Paper, ScrollArea, Stack, Text } from "@mantine/core";
import { useLoaderData, useNavigate, useSearchParams } from "react-router";
import { getActiveAltitudeInfoItems } from "../features/altitude-info/domain/altitudeInfo";
import {
  hasReachedPendingStoryStop,
  resolveNextStoryAwareTarget,
  type PendingStoryStop,
} from "../features/timeline/domain/storyStops";
import AltitudeInfoIndicators from "../features/timeline/components/AltitudeInfoIndicators";
import JourneyPixiTimelineClient from "../features/timeline/pixi/JourneyPixiTimelineClient";
import { DEFAULT_SCROLL_MULTIPLIER, normalizeScrollMultiplier } from "../features/timeline/domain/scrollMultiplier";
import { normalizeBackgroundPatternConfig } from "../features/timeline/pixi/layout/epicBackgroundPattern";
import { getRecentPassedStories } from "../features/timeline/domain/recentStories";
import { useWheelAltitude } from "../shared/hooks/useWheelAltitude";
import { useTranslation } from "react-i18next";
import {
  type Locale,
  nextLocale,
  normalizeLocale,
  resolveRequestLocale,
} from "../shared/i18n/locales";
import { persistLocale } from "../shared/i18n/persistLocale";
import {
  localizeAltitudeInfo,
  localizeEpic,
  localizeJourney,
  localizeStory,
  localizeTag,
} from "../shared/i18n/localizeContent";
import { isHexColor } from "../shared/domain/background";
import { GlassCloseButton, StoryDetailContent } from "../features/timeline/components/StoryDetailContent";
import { db } from "../server/db";
import { countTagsPerItem, filterOutByExcludedTags } from "../features/tags/domain/tags";
import { TagFilterButton } from "../shared/components/tags/TagFilterButton";
import { TagFilterModal } from "../shared/components/tags/TagFilterModal";

type JourneyPageData = Awaited<ReturnType<typeof loader>>;
// Stories handed to the UI are localized — translation rows are resolved into the base
// fields and then stripped (see localizeStory).
type JourneyStory = Omit<JourneyPageData["journey"]["stories"][number], "translations">;

const FAST_STOP_PACE_THRESHOLD = 10;
const FAST_STOP_MIN_JUMP_DISTANCE = 800;

function formatAltitude(altitude: number): string {
  if (altitude < 1000) return `${Math.round(altitude)} m`;
  return `${(altitude / 1000).toFixed(1)} km`;
}


type EpicEnteredCardEpic = {
  title: string;
  description: string;
  color: string;
  startPoint: number;
  endPoint: number;
};

function EpicEnteredCard({ epic, onClose }: { epic: EpicEnteredCardEpic; onClose: () => void }) {
  const { t } = useTranslation();
  const accent = isHexColor(epic.color) ? epic.color : "#4ecdc4";

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 28,
        overflow: "hidden",
        background: "linear-gradient(180deg, rgba(17, 24, 41, 0.95) 0%, rgba(10, 14, 26, 0.97) 100%)",
        boxShadow: `0 36px 90px rgba(12, 16, 26, 0.45), 0 0 0 1px color-mix(in srgb, ${accent} 38%, transparent)`,
        padding: "28px 30px 30px",
      }}
    >
      <GlassCloseButton onClose={onClose} />

      <Stack gap={4} style={{ marginBottom: 20, paddingRight: 40 }}>
        <Text fw={800} style={{ color: "#ffffff", fontSize: 28, lineHeight: 1.12, letterSpacing: "-0.01em" }}>
          {epic.title}
        </Text>
        <Text size="sm" fw={600} style={{ color: "rgba(180, 200, 240, 0.72)" }}>
          {formatAltitude(epic.startPoint)} – {formatAltitude(epic.endPoint)}
        </Text>
      </Stack>

      {epic.description ? (
        <ScrollArea.Autosize mah={360}>
          <Text size="sm" style={{ color: "#d7e1f5", lineHeight: 1.75 }}>
            {epic.description}
          </Text>
        </ScrollArea.Autosize>
      ) : (
        <Text size="sm" style={{ color: "#9fb2d6" }}>
          {t("reader.epicNoDescription")}
        </Text>
      )}
    </div>
  );
}

export async function loader({ params, request }: { params: { id?: string }; request: Request }) {
  if (!params.id) {
    throw new Response("Missing journey id", { status: 400, statusText: "Bad Request" });
  }

  const journey = await db.journey.findUnique({
    where: { id: params.id },
    include: {
      translations: true,
      altitudeInfos: {
        orderBy: [{ order: "asc" }, { title: "asc" }],
        include: {
          translations: true,
          values: {
            orderBy: { startPoint: "asc" },
            include: { translations: true },
          },
          tags: { orderBy: { name: "asc" } },
        },
      },
      epics: {
        orderBy: { startPoint: "asc" },
        include: { translations: true },
      },
      stories: {
        orderBy: { startPoint: "asc" },
        include: {
          translations: true,
          tags: { orderBy: { name: "asc" } },
        },
      },
      tags: { orderBy: { name: "asc" }, include: { translations: true } },
      _count: {
        select: { epics: true, stories: true },
      },
    },
  });

  if (!journey) {
    throw new Response("Journey not found", { status: 404, statusText: "Not Found" });
  }

  return { journey, initialLocale: resolveRequestLocale(request) };
}

export default function JourneyPage() {
  const { journey, initialLocale } = useLoaderData() as Awaited<ReturnType<typeof loader>>;
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [locale, setLocale] = useState<Locale>(normalizeLocale(initialLocale));
  const [scrollMultiplier, setScrollMultiplier] = useState<number>(DEFAULT_SCROLL_MULTIPLIER);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [currentAltitude, setCurrentAltitude] = useState(0);
  const [recentStoriesOpen, setRecentStoriesOpen] = useState(false);
  const [selectedRecentStoryId, setSelectedRecentStoryId] = useState<string | null>(null);
  const [wheelTarget, setWheelTarget] = useState<HTMLDivElement | null>(null);
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const [epicPanelOpen, setEpicPanelOpen] = useState(false);
  const previousEpicIdRef = useRef<string | null>(null);
  const renderedAltitudeRef = useRef(0);
  const pendingStoryStopRef = useRef<PendingStoryStop | null>(null);
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

  // Localized content (resolved against the active locale, with fallback to source text)
  const localizedStories = useMemo(
    () => journey.stories.map((story) => localizeStory(story, locale)),
    [journey.stories, locale],
  );
  const localizedEpics = useMemo(
    () => journey.epics.map((epic) => localizeEpic(epic, locale)),
    [journey.epics, locale],
  );
  const localizedAltitudeInfos = useMemo(
    () => journey.altitudeInfos.map((altitudeInfo) => localizeAltitudeInfo(altitudeInfo, locale)),
    [journey.altitudeInfos, locale],
  );
  const localizedTags = useMemo(
    () => (journey.tags ?? []).map((tag) => localizeTag(tag, locale)),
    [journey.tags, locale],
  );

  // Filtered data
  const filteredStories = useMemo(
    () => filterOutByExcludedTags(localizedStories, enabledTagIds, allTagIds),
    [localizedStories, enabledTagIds, allTagIds],
  );

  const filteredAltitudeInfos = useMemo(
    () => filterOutByExcludedTags(localizedAltitudeInfos, enabledTagIds, allTagIds),
    [localizedAltitudeInfos, enabledTagIds, allTagIds],
  );
  const storyTagCounts = useMemo(
    () => countTagsPerItem(localizedStories, localizedTags),
    [localizedStories, localizedTags],
  );
  const altitudeInfoTagCounts = useMemo(
    () => countTagsPerItem(localizedAltitudeInfos, localizedTags),
    [localizedAltitudeInfos, localizedTags],
  );
  const noFilteredContent = enabledTagIds.length < allTagIds.length && filteredStories.length === 0 && filteredAltitudeInfos.length === 0;

  const selectedStory = filteredStories.find((story) => story.id === selectedStoryId) ?? null;
  const timelineEpics = useMemo(
    () => localizedEpics.map((epic) => ({
      ...epic,
      backgroundPatternConfig: normalizeBackgroundPatternConfig(epic.backgroundPatternConfig),
    })),
    [localizedEpics],
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
    renderedAltitudeRef.current = altitude;

    if (pendingStoryStopRef.current && hasReachedPendingStoryStop(pendingStoryStopRef.current, altitude)) {
      pendingStoryStopRef.current = null;
    }

    startTransition(() => {
      setCurrentAltitude((previousAltitude) => (previousAltitude === altitude ? previousAltitude : altitude));
    });
  }, []);

  const handleAltitudeChange = useCallback(
    ({ nextScaled }: { nextScaled: number }) => {
      const currentAltitude = Math.max(0, Math.min(journeyMaxAltitude, renderedAltitudeRef.current));
      const proposedTargetAltitude = Math.max(0, Math.min(journeyMaxAltitude, nextScaled));
      const jumpDistance = Math.abs(proposedTargetAltitude - currentAltitude);
      const shouldApplyStoryStopClamp = scrollMultiplier >= FAST_STOP_PACE_THRESHOLD
        && jumpDistance >= FAST_STOP_MIN_JUMP_DISTANCE;

      if (!shouldApplyStoryStopClamp) {
        targetAltitudeRef.current = proposedTargetAltitude;
        pendingStoryStopRef.current = null;
        return;
      }

      const resolution = resolveNextStoryAwareTarget({
        currentAltitude,
        proposedTargetAltitude,
        renderedAltitude: renderedAltitudeRef.current,
        pendingStop: pendingStoryStopRef.current,
        stories: filteredStories,
      });

      targetAltitudeRef.current = resolution.nextTargetAltitude;
      pendingStoryStopRef.current = resolution.pendingStop;
    },
    [filteredStories, journeyMaxAltitude, scrollMultiplier],
  );

  const recentPassedStories = useMemo(
    () => getRecentPassedStories(filteredStories, currentAltitude, 10),
    [currentAltitude, filteredStories],
  );

  const selectedRecentStory = recentPassedStories.find((story) => story.id === selectedRecentStoryId) ?? null;
  const selectedEpic = timelineEpics.find((epic) => epic.id === selectedEpicId) ?? null;

  useEffect(() => {
    if (selectedRecentStoryId && !selectedRecentStory) {
      setSelectedRecentStoryId(null);
    }
  }, [selectedRecentStory, selectedRecentStoryId]);

  useEffect(() => {
    const pendingStoryStop = pendingStoryStopRef.current;
    if (!pendingStoryStop) {
      return;
    }

    const storyStillAvailable = filteredStories.some((story) => story.id === pendingStoryStop.storyId);
    if (!storyStillAvailable) {
      pendingStoryStopRef.current = null;
    }
  }, [filteredStories]);

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

  const displayJourneyTitle = useMemo(() => {
    const localizedName = localizeJourney(journey, locale).name;
    const normalizedTitle = typeof localizedName === "string" ? localizedName.trim() : "";
    return normalizedTitle.length > 0 && normalizedTitle !== "Untitled journey" ? normalizedTitle : "teszt2";
  }, [journey, locale]);

  const handleEpicPanelOpenChange = useCallback((open: boolean) => {
    setEpicPanelOpen(open);
  }, []);

  const handleLocaleChange = useCallback(
    (next: Locale) => {
      setLocale((previous) => (previous === next ? previous : next));
      persistLocale(next);
      void i18n.changeLanguage(next);
    },
    [i18n],
  );

  const handleToggleLocale = useCallback(() => {
    handleLocaleChange(nextLocale(locale));
  }, [handleLocaleChange, locale]);

  const pixiLabels = useMemo(
    () => ({
      back: t("pixi.back"),
      share: t("pixi.share"),
      journey: t("pixi.journey"),
    }),
    [t, locale],
  );

  const handleScrollMultiplierChange = useCallback((nextMultiplier: number) => {
    const normalizedMultiplier = normalizeScrollMultiplier(nextMultiplier);

    setScrollMultiplier((previousMultiplier: number) => (
      previousMultiplier === normalizedMultiplier ? previousMultiplier : normalizedMultiplier
    ));
  }, []);

  const handleBackToJourneys = useCallback(() => {
    navigate("/journey");
  }, [navigate]);

  const handleShareJourney = useCallback(() => {
    const sharePayload = {
      title: displayJourneyTitle,
      text: `Check out this journey: ${displayJourneyTitle}`,
      url: window.location.href,
    };

    if (navigator.share) {
      void navigator.share(sharePayload).catch(() => {
        // Ignore cancel/errors from native share sheet.
      });
      return;
    }

    if (navigator.clipboard) {
      void navigator.clipboard.writeText(sharePayload.url).catch(() => {
        // Clipboard can fail in restricted browser contexts.
      });
    }
  }, [displayJourneyTitle]);

  useWheelAltitude({
    pace: scrollMultiplier,
    scaledValueRef: renderedAltitudeRef,
    naturalValueRef: renderedAltitudeRef,
    onChange: handleAltitudeChange,
    enabled: wheelTarget !== null && !epicPanelOpen,
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
          stories={filteredStories.map((s) => ({
            ...s,
            background: s.background ?? "",
            description: s.description ?? "",
            extraContent: s.extraContent ?? "",
            lineColor: s.lineColor ?? "",
            lineLabel: s.lineLabel ?? "",
            tooltipText: s.tooltipText ?? "",
          }))}
          startGround={journey.startingPoint}
          targetAltitudeRef={targetAltitudeRef}
          journeyTitle={displayJourneyTitle}
          scrollMultiplier={scrollMultiplier}
          locale={locale}
          labels={pixiLabels}
          onStoryCardClick={handleStoryCardClick}
          onBackToJourneys={handleBackToJourneys}
          onShareJourney={handleShareJourney}
          onScrollMultiplierChange={handleScrollMultiplierChange}
          onRenderedAltitudeChange={handleRenderedAltitudeChange}
          onEpicPanelOpenChange={handleEpicPanelOpenChange}
          onToggleLocale={handleToggleLocale}
        />
      </div>

      {!epicPanelOpen && <AltitudeInfoIndicators items={activeAltitudeInfos} placement="below-epic" />}

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
            border: "1px solid rgba(188, 212, 255, 0.32)",
            background: "linear-gradient(180deg, rgba(18, 26, 44, 0.7) 0%, rgba(11, 17, 31, 0.7) 100%)",
            boxShadow: "0 14px 30px rgba(5, 7, 15, 0.42)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <Group gap="sm" wrap="nowrap">
            <Text size="sm" c="#eef3ff">
              {t("reader.noFilteredContent")}
            </Text>
            <Button size="xs" variant="light" onClick={() => applyEnabledTagIds(allTagIds)}>
              {t("common.clearFilters")}
            </Button>
          </Group>
        </Paper>
      ) : null}

      {!epicPanelOpen && (
        <TagFilterButton
          activeCount={allTagIds.length - enabledTagIds.length}
          onClick={() => setTagFilterOpen(true)}
        />
      )}

      <TagFilterModal
        opened={tagFilterOpen}
        onClose={() => setTagFilterOpen(false)}
        allTags={localizedTags}
        enabledTagIds={enabledTagIds}
        onApply={applyEnabledTagIds}
        storyCounts={storyTagCounts}
        altitudeInfoCounts={altitudeInfoTagCounts}
      />

      <Modal
        opened={selectedStory !== null}
        onClose={() => setSelectedStoryId(null)}
        withCloseButton={false}
        size="lg"
        centered
        padding={0}
        overlayProps={{ backgroundOpacity: 0.6, blur: 4 }}
        transitionProps={{ transition: "pop", duration: 220 }}
        styles={{
          content: { background: "transparent", boxShadow: "none", overflow: "visible" },
          body: { padding: 0 },
        }}
      >
        {selectedStory ? (
          <StoryDetailContent story={selectedStory} onClose={() => setSelectedStoryId(null)} />
        ) : null}
      </Modal>

      <Modal
        opened={selectedEpic !== null}
        onClose={() => setSelectedEpicId(null)}
        withCloseButton={false}
        size="lg"
        centered
        padding={0}
        overlayProps={{ backgroundOpacity: 0.6, blur: 4 }}
        transitionProps={{ transition: "pop", duration: 220 }}
        styles={{
          content: { background: "transparent", boxShadow: "none", overflow: "visible" },
          body: { padding: 0 },
        }}
      >
        {selectedEpic ? (
          <EpicEnteredCard epic={selectedEpic} onClose={() => setSelectedEpicId(null)} />
        ) : null}
      </Modal>

      <Modal
        opened={recentStoriesOpen}
        onClose={closeRecentStoriesModal}
        withCloseButton={!selectedRecentStory}
        title={selectedRecentStory ? undefined : (
          <Group gap="xs">
            <Text fw={700} c="#f2f6ff">{t("reader.recentStories")}</Text>
            <Badge variant="light" color="teal">{recentPassedStories.length}</Badge>
          </Group>
        )}
        size="xl"
        centered
        padding={selectedRecentStory ? 0 : undefined}
        overlayProps={{ backgroundOpacity: 0.6, blur: 4 }}
        styles={selectedRecentStory ? {
          content: { background: "transparent", boxShadow: "none", overflow: "visible" },
          body: { padding: 0 },
        } : {
          content: {
            background: "linear-gradient(180deg, rgba(17, 24, 41, 0.96) 0%, rgba(10, 14, 26, 0.97) 100%)",
            border: "1px solid rgba(188, 212, 255, 0.18)",
            boxShadow: "0 36px 90px rgba(5, 7, 15, 0.55)",
            backdropFilter: "blur(18px)",
          },
          header: { background: "transparent" },
          close: { color: "#dce6fb" },
        }}
      >
        {selectedRecentStory ? (
          <StoryDetailContent story={selectedRecentStory} onClose={() => setSelectedRecentStoryId(null)} />
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
                    border: "1px solid rgba(188, 212, 255, 0.16)",
                    background: "rgba(255, 255, 255, 0.05)",
                    transition: "transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease",
                    boxShadow: "0 14px 30px rgba(5, 7, 15, 0.28)",
                  }}
                >
                  <Stack gap={8}>
                    <Group justify="space-between" align="flex-start">
                      <Text fw={700} size="md" c="#f2f6ff">
                        {story.title}
                      </Text>
                      <Group gap={6}>
                        <Badge variant="light" color={story.storyType === "LINE" ? "grape" : "teal"}>
                          {story.storyType === "LINE" ? t("reader.line") : t("reader.card")}
                        </Badge>
                        <Badge variant="light" color="teal">{t("reader.passed")}</Badge>
                      </Group>
                    </Group>

                    <Text size="xs" style={{ color: "#9fb2d6" }}>
                      {t("reader.endedAt")} {formatAltitude(story.endPoint)}
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
                          border: "1px solid rgba(188, 212, 255, 0.18)",
                        }}
                      />
                    ) : null}

                    {story.storyType === "LINE" ? (
                      <Text size="xs" style={{ color: "#9fb2d6" }}>
                        {t("reader.label")}: {story.lineLabel || story.title}
                      </Text>
                    ) : null}

                    <Text size="sm" c="#d7e1f5" lineClamp={2}>
                      {story.description || t("reader.noDescription")}
                    </Text>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </ScrollArea.Autosize>
        ) : (
          <Text style={{ color: "#9fb2d6" }}>{t("reader.recentStoriesEmpty")}</Text>
        )}
      </Modal>

      {recentPassedStories.length > 0 ? (
        <button
          type="button"
          aria-label={t("reader.recentStories")}
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
            border: "1px solid rgba(188, 212, 255, 0.32)",
            background: "linear-gradient(180deg, rgba(18, 26, 44, 0.62) 0%, rgba(11, 17, 31, 0.62) 100%)",
            boxShadow: "0 14px 30px rgba(5, 7, 15, 0.42)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
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
              color: "#dce6fb",
              fontFamily: "Avenir Next, Trebuchet MS, sans-serif",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {t("reader.recentStories")}
          </span>
        </button>
      ) : null}

    </>
  );
}
