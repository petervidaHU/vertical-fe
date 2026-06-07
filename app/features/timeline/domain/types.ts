export enum TimelineItemType {
  Story = 'story',
  Epic = 'epic',
}

export interface TimelineItem {
  id: string;
  type: TimelineItemType;
  title: string;
  description: string;
  extraContent?: string;
  imageUrl?: string;
  startPoint: number;
  endPoint: number;
}

export interface TimelineData {
  stories: TimelineItem[];
  epics: TimelineItem[];
}

/** Lightweight epic shape returned by the /story/timeline metadata endpoint */
export interface TimelineEpicMeta {
  id: string;
  title: string;
  startPoint: number;
  endPoint: number;
}

export interface TimelineProgress {
  epics: TimelineEpicMeta[];
  endOfTheWorld: number;
  lastId: string;
}
