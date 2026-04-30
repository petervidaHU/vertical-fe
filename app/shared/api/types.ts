export interface StoryDto {
  id: string;
  title: string;
  epicTitle?: string;
  passed?: boolean;
}

export interface Story {
  id: string;
  title: string;
  epicTitle: string;
  isPassed: boolean;
}

export interface CreateStoryInput {
  title: string;
  epicTitle?: string;
}

export interface UpdateStoryInput extends CreateStoryInput {
  id: string;
}

export interface ApiError {
  status: number;
  message: string;
}

// ── Timeline DTOs ───────────────────────────────────────────────────────────

export interface TimelineItemDto {
  id: string;
  type: 'story' | 'epic';
  title: string;
  description: string;
  startPoint: number;
  endPoint: number;
}

export interface TimelineDataDto {
  stories: TimelineItemDto[];
  epics: TimelineItemDto[];
}

export interface TimelineProgressDto {
  epics: Array<{ id: string; title: string; startPoint: number; endPoint: number }>;
  last: {
    endOfTheWorld: number;
    lastId: string;
  };
}
