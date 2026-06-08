const MIN_ENTRY_MARGIN = 120;
const MAX_ENTRY_MARGIN = 260;
const MIN_EXIT_MARGIN = 100;
const MAX_EXIT_MARGIN = 220;
const LOGICAL_SCROLL_STEP_ALTITUDE = 120;
const MIN_STORY_SCROLL_STEPS = 4;
const MIN_ACTIVE_SCROLL_SPAN = LOGICAL_SCROLL_STEP_ALTITUDE * MIN_STORY_SCROLL_STEPS;

export type StoryAltitudeRange = {
  startPoint: number;
  endPoint: number;
};

export type StoryVisibilityBand = {
  entryStart: number;
  activeEnd: number;
  exitEnd: number;
  entryMargin: number;
  exitMargin: number;
};

export type StoryMotionStatePhase =
  | "hidden-before"
  | "entering"
  | "active"
  | "exiting"
  | "hidden-after";

export type StoryMotionState = {
  visible: boolean;
  phase: StoryMotionStatePhase;
  progress: number;
  entryStart: number;
  activeEnd: number;
  exitEnd: number;
};

export type StoryCardPresentationPhase =
  | "hidden-before"
  | "entering"
  | "active"
  | "exiting"
  | "hidden-after";

export type StoryCardPresentation = {
  visible: boolean;
  phase: StoryMotionStatePhase;
  y: number;
  alpha: number;
  rotation: number;
  entryStart: number;
  activeEnd: number;
  exitEnd: number;
};

export type StoryLinePresentation = {
  visible: boolean;
  phase: StoryMotionStatePhase;
  y: number;
  alpha: number;
  entryStart: number;
  activeEnd: number;
  exitEnd: number;
};

type CardPresentationOptions = {
  story: StoryAltitudeRange;
  altitude: number;
  topDockY: number;
  bottomDockY: number;
  rendererHeight: number;
  offscreenDistance: number;
};

type LinePresentationOptions = {
  story: StoryAltitudeRange;
  altitude: number;
  topY: number;
  bottomY: number;
  rendererHeight: number;
  offscreenDistance: number;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOutCubic(value: number): number {
  const t = clamp01(value);
  if (t < 0.5) {
    return 4 * t * t * t;
  }

  return 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeInOutSine(value: number): number {
  const t = clamp01(value);
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function getStoryVisibilityBand(story: StoryAltitudeRange): StoryVisibilityBand {
  const activeEnd = getEffectiveStoryEndPoint(story);
  const span = Math.max(1, activeEnd - story.startPoint);
  const entryMargin = Math.min(MAX_ENTRY_MARGIN, Math.max(MIN_ENTRY_MARGIN, span * 0.6));
  const exitMargin = Math.min(MAX_EXIT_MARGIN, Math.max(MIN_EXIT_MARGIN, span * 0.45));

  return {
    entryStart: story.startPoint - entryMargin,
    activeEnd,
    exitEnd: activeEnd + exitMargin,
    entryMargin,
    exitMargin,
  };
}

export function getEffectiveStoryEndPoint(story: StoryAltitudeRange): number {
  return Math.max(story.endPoint, story.startPoint + MIN_ACTIVE_SCROLL_SPAN);
}

export function getStoryMotionState(story: StoryAltitudeRange, altitude: number): StoryMotionState {
  const { entryStart, activeEnd, exitEnd, entryMargin, exitMargin } = getStoryVisibilityBand(story);

  if (altitude <= entryStart) {
    return {
      visible: false,
      phase: "hidden-before",
      progress: 0,
      entryStart,
      activeEnd,
      exitEnd,
    };
  }

  if (altitude < story.startPoint) {
    return {
      visible: true,
      phase: "entering",
      progress: clamp01((altitude - entryStart) / Math.max(1, entryMargin)),
      entryStart,
      activeEnd,
      exitEnd,
    };
  }

  if (altitude <= activeEnd) {
    return {
      visible: true,
      phase: "active",
      progress: clamp01((altitude - story.startPoint) / Math.max(1, activeEnd - story.startPoint)),
      entryStart,
      activeEnd,
      exitEnd,
    };
  }

  if (altitude < exitEnd) {
    return {
      visible: true,
      phase: "exiting",
      progress: clamp01((altitude - activeEnd) / Math.max(1, exitMargin)),
      entryStart,
      activeEnd,
      exitEnd,
    };
  }

  return {
    visible: false,
    phase: "hidden-after",
    progress: 1,
    entryStart,
    activeEnd,
    exitEnd,
  };
}

export function getCardPresentation({
  story,
  altitude,
  topDockY,
  bottomDockY,
  rendererHeight,
  offscreenDistance,
}: CardPresentationOptions): StoryCardPresentation {
  const motion = getStoryMotionState(story, altitude);
  const offscreenTopY = -offscreenDistance;
  const offscreenBottomY = rendererHeight + offscreenDistance;
  const { entryStart, activeEnd, exitEnd } = motion;

  if (!motion.visible && motion.phase === "hidden-before") {
    return {
      visible: false,
      phase: "hidden-before",
      y: offscreenTopY,
      alpha: 0,
      rotation: -0.04,
      entryStart,
      activeEnd,
      exitEnd,
    };
  }

  if (motion.phase === "entering") {
    return {
      visible: true,
      phase: "entering",
      y: lerp(offscreenTopY, topDockY, easeInOutSine(motion.progress)),
      alpha: lerp(0, 0.96, easeInOutSine(motion.progress)),
      rotation: 0,
      entryStart,
      activeEnd,
      exitEnd,
    };
  }

  if (motion.phase === "active") {
    return {
      visible: true,
      phase: "active",
      y: lerp(topDockY, bottomDockY, easeInOutCubic(motion.progress)),
      alpha: 0.96,
      rotation: 0,
      entryStart,
      activeEnd,
      exitEnd,
    };
  }

  if (motion.phase === "exiting") {
    return {
      visible: true,
      phase: "exiting",
      y: lerp(bottomDockY, offscreenBottomY, easeInOutSine(motion.progress)),
      alpha: lerp(0.96, 0, easeInOutSine(motion.progress)),
      rotation: 0,
      entryStart,
      activeEnd,
      exitEnd,
    };
  }

  return {
    visible: false,
    phase: "hidden-after",
    y: offscreenBottomY,
    alpha: 0,
    rotation: 0,
    entryStart,
    activeEnd,
    exitEnd,
  };
}

export function getLinePresentation({
  story,
  altitude,
  topY,
  bottomY,
  rendererHeight,
  offscreenDistance,
}: LinePresentationOptions): StoryLinePresentation {
  const motion = getStoryMotionState(story, altitude);
  const offscreenTopY = -offscreenDistance;
  const offscreenBottomY = rendererHeight + offscreenDistance;

  if (!motion.visible && motion.phase === "hidden-before") {
    return {
      visible: false,
      phase: "hidden-before",
      y: offscreenTopY,
      alpha: 0,
      entryStart: motion.entryStart,
      activeEnd: motion.activeEnd,
      exitEnd: motion.exitEnd,
    };
  }

  if (motion.phase === "entering") {
    return {
      visible: true,
      phase: "entering",
      y: lerp(offscreenTopY, topY, easeInOutSine(motion.progress)),
      alpha: lerp(0, 0.9, easeInOutSine(motion.progress)),
      entryStart: motion.entryStart,
      activeEnd: motion.activeEnd,
      exitEnd: motion.exitEnd,
    };
  }

  if (motion.phase === "active") {
    return {
      visible: true,
      phase: "active",
      y: lerp(topY, bottomY, easeInOutCubic(motion.progress)),
      alpha: 0.9,
      entryStart: motion.entryStart,
      activeEnd: motion.activeEnd,
      exitEnd: motion.exitEnd,
    };
  }

  if (motion.phase === "exiting") {
    return {
      visible: true,
      phase: "exiting",
      y: lerp(bottomY, offscreenBottomY, easeInOutSine(motion.progress)),
      alpha: lerp(0.9, 0, easeInOutSine(motion.progress)),
      entryStart: motion.entryStart,
      activeEnd: motion.activeEnd,
      exitEnd: motion.exitEnd,
    };
  }

  return {
    visible: false,
    phase: "hidden-after",
    y: offscreenBottomY,
    alpha: 0,
    entryStart: motion.entryStart,
    activeEnd: motion.activeEnd,
    exitEnd: motion.exitEnd,
  };
}