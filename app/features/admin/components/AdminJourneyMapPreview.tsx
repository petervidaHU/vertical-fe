import { Stack } from '@mantine/core';
import { Application, Container, Graphics, Rectangle, Text as PixiText } from 'pixi.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  parseStoredBackground,
  primaryColorFromBackground,
} from '../../../shared/domain/background';

type EpicMapItem = {
  id: string;
  title: string;
  color: string;
  background: string;
  startPoint: number;
  endPoint: number;
};

type StoryMapItem = {
  id: string;
  title: string;
  description: string;
  extraContent: string;
  storyType: 'CARD' | 'LINE';
  background: string;
  imageUrl: string | null;
  lineColor: string;
  lineWidth: number;
  lineLabel: string;
  tooltipText: string;
  tooltipImageUrl: string | null;
  startPoint: number;
  endPoint: number;
};

type AdminJourneyMapPreviewProps = {
  journeyName: string;
  startGround: string;
  epics: EpicMapItem[];
  stories: StoryMapItem[];
  height?: number | string;
  getEpicHref?: (epicId: string) => string;
  getStoryHref?: (storyId: string) => string;
  selectedEpicId?: string | null;
  selectedStoryId?: string | null;
  highlightedStoryIds?: string[];
};

type HoverInfo = {
  x: number;
  y: number;
  label: string;
  kind: 'track' | 'epic' | 'story' | 'ground';
  title?: string;
  start?: number;
  end?: number;
  span?: number;
};

const AdminJourneyMapPreview = ({
  journeyName: _journeyName,
  startGround,
  epics,
  stories,
  height = 'calc(100vh - 140px)',
  getEpicHref,
  getStoryHref,
  selectedEpicId = null,
  selectedStoryId = null,
  highlightedStoryIds = [],
}: AdminJourneyMapPreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const appReadyRef = useRef(false);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const setTooltipRef = useRef(setHoverInfo);
  setTooltipRef.current = setHoverInfo;

  // ── Derived data ────────────────────────────────────────────────────────
  const totalDistance = useMemo(() => {
    const storyMax = stories.reduce((max, s) => Math.max(max, s.endPoint), 0);
    const epicMax = epics.reduce((max, e) => Math.max(max, e.endPoint), 0);
    return Math.max(1, storyMax, epicMax);
  }, [epics, stories]);

  const derivedEpics = useMemo(
    () =>
      epics
        .map((epic) => ({
          id: epic.id,
          title: epic.title,
          startPoint: epic.startPoint,
          endPoint: epic.endPoint,
          color: primaryColorFromBackground(
            parseStoredBackground(epic.background, epic.color || '#4ecdc4'),
          ),
        }))
        .sort((a, b) => a.startPoint - b.startPoint),
    [epics],
  );

  const derivedStories = useMemo(
    () =>
      stories
        .map((story) => ({
          id: story.id,
          title: story.title,
          storyType: story.storyType,
          startPoint: story.startPoint,
          endPoint: story.endPoint,
          lineColor: story.lineColor,
          lineWidth: story.lineWidth,
          color: primaryColorFromBackground(parseStoredBackground(story.background, '#4ecdc4')),
        }))
        .sort((a, b) => a.startPoint - b.startPoint),
    [stories],
  );

  const startGroundColor = useMemo(
    () => primaryColorFromBackground(parseStoredBackground(startGround, '#4b3726')),
    [startGround],
  );

  // ── Draw-data ref (always current, read inside stable drawScene) ─────────
  type DrawData = {
    epics: typeof derivedEpics;
    stories: typeof derivedStories;
    totalDistance: number;
    startGroundColor: string;
    selectedEpicId: string | null;
    selectedStoryId: string | null;
    highlightedStoryIds: string[];
    getEpicHref?: (id: string) => string;
    getStoryHref?: (id: string) => string;
  };
  const drawDataRef = useRef<DrawData>({
    epics: derivedEpics,
    stories: derivedStories,
    totalDistance,
    startGroundColor,
    selectedEpicId,
    selectedStoryId,
    highlightedStoryIds,
    getEpicHref,
    getStoryHref,
  });
  drawDataRef.current = {
    epics: derivedEpics,
    stories: derivedStories,
    totalDistance,
    startGroundColor,
    selectedEpicId,
    selectedStoryId,
    highlightedStoryIds,
    getEpicHref,
    getStoryHref,
  };

  // ── Stable draw function ─────────────────────────────────────────────────
  const drawScene = useCallback(() => {
    const app = appRef.current;
    if (!app || !appReadyRef.current || !app.renderer || !app.screen || !app.stage) return;

    const W = app.screen.width;
    const H = app.screen.height;
    if (W < 20 || H < 20) return;

    const {
      epics,
      stories,
      totalDistance,
      startGroundColor,
      selectedEpicId,
      selectedStoryId,
      highlightedStoryIds,
      getEpicHref,
      getStoryHref,
    } = drawDataRef.current;

    app.stage.removeChildren();

    const PAD_TOP = 24;
    const PAD_BOTTOM = 52;
    const trackTop = PAD_TOP;
    const trackBottom = H - PAD_BOTTOM;
    const trackLen = trackBottom - trackTop;
    const trackX = Math.round(W / 2);
    const TRACK_W = Math.max(18, Math.round(W * 0.14));
    const EPIC_W = TRACK_W + 14;
    const STORY_W = Math.max(10, Math.round(TRACK_W * 0.72));
    const TOOLTIP_W = 300;
    const TOOLTIP_H = 92;

    const toY = (alt: number) => {
      const c = Math.max(0, Math.min(totalDistance, alt));
      return trackBottom - (c / totalDistance) * trackLen;
    };
    const toM = (v: number) => `${Math.round(v)}m`;
    const trim = (v: string, max = 11) => (v.length <= max ? v : `${v.slice(0, max - 1)}…`);
    const showTip = (payload: HoverInfo) => {
      const rightOfBarX = trackX + TRACK_W / 2 + 14;
      const clampedX = Math.max(8, Math.min(W - TOOLTIP_W - 8, rightOfBarX));
      const clampedY = Math.max(8, Math.min(H - TOOLTIP_H - 8, payload.y - TOOLTIP_H / 2));
      setTooltipRef.current({ ...payload, x: clampedX, y: clampedY });
    };
    const hideTip = () => setTooltipRef.current(null);

    // ── Background ──────────────────────────────────────────────────────
    const bg = new Graphics();
    bg.rect(0, 0, W, H).fill({ color: '#f5f8ff' });
    app.stage.addChild(bg);

    // ── Altitude tick marks ─────────────────────────────────────────────
    const ticks = new Graphics();
    [0, 0.25, 0.5, 0.75, 1].forEach((f) => {
      const ty = toY(totalDistance * f);
      ticks
        .moveTo(trackX + TRACK_W / 2 + 4, ty)
        .lineTo(trackX + TRACK_W / 2 + 10, ty)
        .stroke({ color: '#5f738a', width: 1, alpha: 0.7 });
    });
    app.stage.addChild(ticks);

    // ── Main track bar ───────────────────────────────────────────────────
    const track = new Graphics();
    track
      .roundRect(trackX - TRACK_W / 2, trackTop, TRACK_W, trackLen, TRACK_W / 2)
      .fill({ color: '#27384f', alpha: 0.88 });
    app.stage.addChild(track);

    // ── Track hit area — live height tooltip ─────────────────────────────
    const trackHit = new Container();
    trackHit.eventMode = 'static';
    trackHit.hitArea = new Rectangle(trackX - TRACK_W / 2 - 10, trackTop, TRACK_W + 20, trackLen);
    trackHit.on('pointermove', (e) => {
      const cy = Math.max(trackTop, Math.min(trackBottom, e.global.y));
      const alt = ((trackBottom - cy) / trackLen) * totalDistance;
      showTip({
        x: 0,
        y: cy - 10,
        label: 'Journey altitude',
        kind: 'track',
        title: 'Journey altitude',
        start: alt,
        end: alt,
        span: 0,
      });
    });
    trackHit.on('pointerout', hideTip);
    app.stage.addChild(trackHit);

    // ── Epic segments ────────────────────────────────────────────────────
    epics.forEach((epic) => {
      const yStart = toY(epic.startPoint);
      const yEnd = toY(epic.endPoint);
      const y = Math.min(yStart, yEnd);
      const h = Math.max(8, Math.abs(yStart - yEnd));
      const isSelected = epic.id === selectedEpicId;
      const span = Math.abs(epic.endPoint - epic.startPoint);
      const href = getEpicHref?.(epic.id);

      const g = new Graphics();
      g.roundRect(trackX - EPIC_W / 2, y, EPIC_W, h, 4).fill({
        color: epic.color,
        alpha: isSelected ? 1 : 0.9,
      });
      if (isSelected) {
        g.roundRect(trackX - EPIC_W / 2, y, EPIC_W, h, 4).stroke({
          color: '#112338',
          width: 1.5,
        });
      }
      app.stage.addChild(g);

      const hit = new Container();
      hit.eventMode = 'static';
      hit.cursor = href ? 'pointer' : 'default';
      hit.hitArea = new Rectangle(trackX - EPIC_W / 2 - 6, y, EPIC_W + 12, h);
      hit.on('pointerover', () =>
        showTip({
          x: 0,
          y: y + h / 2 - 10,
          label: `Epic: ${epic.title}`,
          kind: 'epic',
          title: epic.title,
          start: epic.startPoint,
          end: epic.endPoint,
          span,
        }),
      );
      hit.on('pointerout', hideTip);
      hit.on('pointerup', () => {
        if (href) navigateRef.current(href);
      });
      app.stage.addChild(hit);
    });

    // ── Story spans (rectangles with start/end heights) ─────────────────
    stories.forEach((story, idx) => {
      const yStart = toY(story.startPoint);
      const yEnd = toY(story.endPoint);
      const y = Math.min(yStart, yEnd);
      const h = Math.max(7, Math.abs(yStart - yEnd));
      const lane = idx % 4;
      const side = lane < 2 ? -1 : 1;
      const laneDepth = lane % 2;
      const baseOffset = TRACK_W / 2 + STORY_W / 2 + 10;
      const laneStep = STORY_W + 7;
      const cx = trackX + side * (baseOffset + laneDepth * laneStep);
      const isSelected = story.id === selectedStoryId;
      const isHighlighted = highlightedStoryIds.includes(story.id);
      const alpha = isSelected || isHighlighted ? 1 : 0.75;
      const span = Math.abs(story.endPoint - story.startPoint);
      const href = getStoryHref?.(story.id);

      const g = new Graphics();
      g.roundRect(cx - STORY_W / 2, y, STORY_W, h, 3).fill({
        color: story.color,
        alpha,
      });

      const strokeColor = isSelected ? '#10253e' : isHighlighted ? '#0a7f68' : '#0f2238';
      const strokeWidth = isSelected ? 2 : isHighlighted ? 1.5 : 1;
      g.roundRect(cx - STORY_W / 2, y, STORY_W, h, 3).stroke({
        color: strokeColor,
        width: strokeWidth,
      });
      app.stage.addChild(g);

      const hit = new Container();
      hit.eventMode = 'static';
      hit.cursor = href ? 'pointer' : 'default';
      hit.hitArea = new Rectangle(cx - STORY_W / 2 - 5, y, STORY_W + 10, h);
      hit.on('pointerover', () =>
        showTip({
          x: 0,
          y: y + h / 2 - 10,
          label: `Story: ${story.title}`,
          kind: 'story',
          title: story.title,
          start: story.startPoint,
          end: story.endPoint,
          span,
        }),
      );
      hit.on('pointerout', hideTip);
      hit.on('pointerup', () => {
        if (href) navigateRef.current(href);
      });
      app.stage.addChild(hit);
    });

    // ── Epic labels (first / last) ────────────────────────────────────────
    if (epics.length > 0) {
      const first = epics[0];
      const l = new PixiText({
        text: `E1 ${trim(first.title)}`,
        style: { fontFamily: 'sans-serif', fontSize: 11, fill: '#22354d', fontWeight: 'bold' },
      });
      l.x = 4;
      l.y = Math.max(trackTop + 2, toY(first.startPoint) - 14);
      app.stage.addChild(l);
    }
    if (epics.length > 1) {
      const last = epics[epics.length - 1];
      const l = new PixiText({
        text: `E${epics.length} ${trim(last.title)}`,
        style: { fontFamily: 'sans-serif', fontSize: 11, fill: '#22354d', fontWeight: 'bold' },
      });
      l.x = 4;
      l.y = Math.min(trackBottom - 16, toY(last.endPoint) - 14);
      app.stage.addChild(l);
    }

    // ── Milestone story labels ─────────────────────────────────────────────
    const src = stories;
    if (src.length > 0) {
      const milestones = [src[0], src[Math.floor(src.length / 2)], src[src.length - 1]].filter(
        (s, i, a) => a.findIndex((x) => x.id === s.id) === i,
      );
      milestones.forEach((story, mi) => {
        const y = toY(story.startPoint);
        const side = mi % 2 === 0 ? -1 : 1;
        const l = new PixiText({
          text: `S ${trim(story.title)}`,
          style: { fontFamily: 'sans-serif', fontSize: 10, fill: '#3a4f67', fontWeight: 'bold' },
        });
        if (side < 0) {
          l.anchor.x = 1;
          l.x = trackX - TRACK_W / 2 - STORY_W * 2.4;
        } else {
          l.x = trackX + TRACK_W / 2 + STORY_W * 2.1;
        }
        l.y = y - 8;
        app.stage.addChild(l);
      });
    }

    // ── Start-ground block ────────────────────────────────────────────────
    const sgW = Math.max(48, TRACK_W + 18);
    const sgH = 10;
    const sgX = trackX - sgW / 2;
    const sgY = trackBottom + 10;
    const sg = new Graphics();
    sg.roundRect(sgX, sgY, sgW, sgH, 3)
      .fill({ color: startGroundColor })
      .stroke({ color: '#1e2d40', width: 0.8 });
    app.stage.addChild(sg);

    const sgHit = new Container();
    sgHit.eventMode = 'static';
    sgHit.hitArea = new Rectangle(sgX - 6, sgY - 4, sgW + 12, sgH + 8);
    sgHit.on('pointerover', () =>
      showTip({
        x: 0,
        y: sgY - 8,
        label: 'Start ground',
        kind: 'ground',
        title: 'Start ground',
        start: 0,
        end: 0,
        span: 0,
      }),
    );
    sgHit.on('pointerout', hideTip);
    app.stage.addChild(sgHit);

    app.render();
  }, []);

  // ── Init PixiJS app ───────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const app = new Application();
    appReadyRef.current = false;
    let disposed = false;
    let initialized = false;

    const initApp = async () => {
      try {
        await app.init({
          resizeTo: el,
          background: '#f5f8ff',
          antialias: true,
          autoDensity: true,
          resolution: window.devicePixelRatio || 1,
          autoStart: false,
        });
        initialized = true;

        if (disposed) {
          app.destroy({ removeView: true }, { children: true });
          return;
        }

        appRef.current = app;
        appReadyRef.current = true;
        app.canvas.style.position = 'absolute';
        app.canvas.style.inset = '0';
        app.canvas.style.width = '100%';
        app.canvas.style.height = '100%';
        el.appendChild(app.canvas);
        app.renderer.on('resize', drawScene);
        drawScene();
      } catch {
        appReadyRef.current = false;
        appRef.current = null;
      }
    };

    void initApp();

    return () => {
      disposed = true;
      appReadyRef.current = false;
      if (initialized) {
        app.renderer.off('resize', drawScene);
        app.destroy({ removeView: true }, { children: true });
      }
      appRef.current = null;
    };
  }, [drawScene]);

  // ── Redraw when data changes ──────────────────────────────────────────────
  useEffect(() => {
    if (appRef.current && appReadyRef.current) drawScene();
  }, [
    derivedEpics,
    derivedStories,
    totalDistance,
    startGroundColor,
    selectedEpicId,
    selectedStoryId,
    highlightedStoryIds,
    drawScene,
  ]);

  return (
    <Stack gap={6} align="center">
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height,
          minHeight: 560,
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid rgba(42, 70, 98, 0.45)',
          position: 'relative',
          background: '#f5f8ff',
        }}
      >
        {/* PixiJS canvas is appended here imperatively */}
        {hoverInfo ? (
          <div
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              left: hoverInfo.x,
              top: hoverInfo.y,
              transform: 'none',
              maxWidth: 300,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(19, 34, 52, 0.97)',
              color: '#f2f7ff',
              fontSize: 13,
              fontWeight: 700,
              lineHeight: 1.3,
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              boxShadow: '0 4px 14px rgba(14, 21, 34, 0.32)',
              zIndex: 20,
            }}
          >
            <div style={{ marginBottom: 4 }}>{hoverInfo.title || hoverInfo.label}</div>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.98 }}>
              Start: {Math.round(hoverInfo.start ?? 0)}m
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.98 }}>
              End: {Math.round(hoverInfo.end ?? hoverInfo.start ?? 0)}m
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.98 }}>
              Span: {Math.round(hoverInfo.span ?? 0)}m
            </div>
          </div>
        ) : null}
      </div>
    </Stack>
  );
};

export default AdminJourneyMapPreview;
