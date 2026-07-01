import { ActionIcon, ScrollArea, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { isHexColor, parseStoredBackground, primaryColorFromBackground } from "../../../shared/domain/background";

export type StoryPreviewData = {
  storyType: "CARD" | "LINE";
  lineColor: string | null;
  background: string | null;
  startPoint: number;
  endPoint: number;
  lineLabel: string | null;
  tooltipText: string | null;
  description: string | null;
  title: string;
  imageUrl: string | null;
  extraContent: string | null;
};

function formatAltitude(altitude: number): string {
  if (altitude < 1000) return `${Math.round(altitude)} m`;
  return `${(altitude / 1000).toFixed(1)} km`;
}

export function GlassCloseButton({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <ActionIcon
      onClick={onClose}
      variant="transparent"
      aria-label={t("common.close")}
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        zIndex: 3,
        width: 34,
        height: 34,
        borderRadius: 999,
        color: "rgba(255, 255, 255, 0.92)",
        background: "rgba(16, 21, 34, 0.4)",
        border: "1px solid rgba(255, 255, 255, 0.28)",
        backdropFilter: "blur(8px)",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </ActionIcon>
  );
}

export function StoryDetailContent({ story, onClose }: { story: StoryPreviewData; onClose: () => void }) {
  const { t } = useTranslation();
  const isLine = story.storyType === "LINE";
  const accent = isLine
    ? (isHexColor(story.lineColor ?? "") ? (story.lineColor as string) : "#4ecdc4")
    : primaryColorFromBackground(parseStoredBackground(story.background, "#4ecdc4"));
  const altitudeDisplay = isLine
    ? formatAltitude(story.startPoint)
    : `${formatAltitude(story.startPoint)} – ${formatAltitude(story.endPoint)}`;
  const lineLabel = isLine && story.lineLabel && story.lineLabel !== story.title ? story.lineLabel : null;
  const bodyText = isLine
    ? (story.tooltipText || story.description)
    : story.description;

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 28,
        overflow: "hidden",
        background: "linear-gradient(180deg, rgba(248, 251, 255, 0.97) 0%, rgba(242, 247, 255, 0.98) 100%)",
        boxShadow: `0 24px 60px rgba(12, 16, 26, 0.22), 0 0 0 1px color-mix(in srgb, ${accent} 30%, rgba(180, 210, 255, 0.35))`,
      }}
    >
      {story.imageUrl ? (
        <div style={{ position: "relative", height: 220 }}>
          <img
            src={story.imageUrl}
            alt={story.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(8, 11, 20, 0.05) 28%, rgba(8, 11, 20, 0.82) 100%)",
            }}
          />
          <GlassCloseButton onClose={onClose} />
          <div style={{ position: "absolute", left: 24, right: 24, bottom: 18 }}>
            {lineLabel ? (
              <Text style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                {lineLabel}
              </Text>
            ) : null}
            <Text fw={800} style={{ color: "#ffffff", fontSize: 26, lineHeight: 1.15, letterSpacing: "-0.01em", marginBottom: 6 }}>
              {story.title}
            </Text>
            <Text style={{ color: "rgba(255, 255, 255, 0.78)", fontSize: 13, lineHeight: 1.4 }}>
              {altitudeDisplay}
            </Text>
          </div>
        </div>
      ) : (
        <div
          style={{
            position: "relative",
            padding: "28px 28px 26px",
            overflow: "hidden",
            background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 90%, #0c1020) 0%, color-mix(in srgb, ${accent} 50%, #0c1020) 100%)`,
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: -90,
              right: -70,
              width: 220,
              height: 220,
              borderRadius: "50%",
              background: `radial-gradient(circle, color-mix(in srgb, ${accent} 65%, #ffffff) 0%, transparent 70%)`,
              opacity: 0.4,
              pointerEvents: "none",
            }}
          />
          <GlassCloseButton onClose={onClose} />
          <Stack gap={4} style={{ position: "relative" }}>
            {lineLabel ? (
              <Text style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {lineLabel}
              </Text>
            ) : null}
            <Text fw={800} style={{ color: "#ffffff", fontSize: 26, lineHeight: 1.15, letterSpacing: "-0.01em" }}>
              {story.title}
            </Text>
            <Text style={{ color: "rgba(255, 255, 255, 0.78)", fontSize: 13, lineHeight: 1.4 }}>
              {altitudeDisplay}
            </Text>
          </Stack>
        </div>
      )}

      <div style={{ padding: "22px 28px 28px" }}>
        <Stack gap="md">
          <Text size="sm" style={{ color: "#1e2d4a", lineHeight: 1.75 }}>
            {bodyText || t("reader.noDescription")}
          </Text>

          {story.extraContent ? (
            <ScrollArea.Autosize mah={420}>
              <div
                style={{ lineHeight: 1.7, fontSize: 15, color: "#1e2d4a" }}
                dangerouslySetInnerHTML={{ __html: story.extraContent }}
              />
            </ScrollArea.Autosize>
          ) : null}
        </Stack>
      </div>
    </div>
  );
}
