import { useEffect, useState } from "react";

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

type AdminJourneyMapPreviewComponent = (props: AdminJourneyMapPreviewProps) => JSX.Element;

export default function AdminJourneyMapPreviewClient(props: AdminJourneyMapPreviewProps) {
  const [PreviewComponent, setPreviewComponent] = useState<AdminJourneyMapPreviewComponent | null>(null);

  useEffect(() => {
    let isMounted = true;

    void import("./AdminJourneyMapPreview").then((module) => {
      if (isMounted) {
        setPreviewComponent(() => module.default as AdminJourneyMapPreviewComponent);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!PreviewComponent) {
    return <div style={{ minHeight: 560, width: "100%", borderRadius: 8, background: "#f5f8ff" }} />;
  }

  return <PreviewComponent {...props} />;
}
