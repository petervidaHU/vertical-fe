import type { MutableRefObject } from "react";
import { useEffect, useState } from "react";
import type { BackgroundPatternConfig } from "./layout/epicBackgroundPattern";

type EpicItem = {
  id: string;
  title: string;
  color: string;
  background: string;
  backgroundImage: string | null;
  backgroundPatternConfig: BackgroundPatternConfig | null;
  startPoint: number;
  endPoint: number;
};

type StoryItem = {
  id: string;
  title: string;
  description: string;
  extraContent: string;
  storyType: "CARD" | "LINE";
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

type JourneyPixiTimelineProps = {
  epics: EpicItem[];
  stories: StoryItem[];
  startGround: string;
  targetAltitudeRef: MutableRefObject<number>;
  journeyTitle?: string;
  scrollMultiplier?: number;
  viewMode?: "full" | "line-only";
  onStoryCardClick?: (story: StoryItem) => void;
  onBackToJourneys?: () => void;
  onShareJourney?: () => void;
  onScrollMultiplierChange?: (nextMultiplier: number) => void;
  onRenderedAltitudeChange?: (altitude: number) => void;
};

type JourneyPixiTimelineComponent = (props: JourneyPixiTimelineProps) => JSX.Element;

export default function JourneyPixiTimelineClient(props: JourneyPixiTimelineProps) {
  const [TimelineComponent, setTimelineComponent] = useState<JourneyPixiTimelineComponent | null>(null);

  useEffect(() => {
    let isMounted = true;

    void import("./JourneyPixiTimeline").then((module) => {
      if (isMounted) {
        setTimelineComponent(() => module.default as JourneyPixiTimelineComponent);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!TimelineComponent) {
    return <div style={{ width: "100%", height: "100%", background: "#050c15" }} />;
  }

  return <TimelineComponent {...props} />;
}
