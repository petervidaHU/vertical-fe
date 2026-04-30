import { apiRequest } from "./client";
import { CreateStoryInput, StoryDto, TimelineDataDto, TimelineProgressDto, UpdateStoryInput } from "./types";

export function getStories(): Promise<StoryDto[]> {
  return apiRequest<StoryDto[]>({
    path: "/stories",
    method: "GET",
  });
}

export function getStoryById(id: string): Promise<StoryDto> {
  return apiRequest<StoryDto>({
    path: `/stories/${id}`,
    method: "GET",
  });
}

export function createStory(payload: CreateStoryInput): Promise<StoryDto> {
  return apiRequest<StoryDto>({
    path: "/stories",
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateStory(payload: UpdateStoryInput): Promise<StoryDto> {
  return apiRequest<StoryDto>({
    path: `/stories/${payload.id}`,
    method: "PUT",
    body: JSON.stringify({
      title: payload.title,
      epicTitle: payload.epicTitle,
    }),
  });
}

// ── Timeline endpoints ────────────────────────────────────────────────────

export function prefetchTimeline(altitude: number): Promise<TimelineDataDto> {
  return apiRequest<TimelineDataDto>({
    path: `/story/pre/${altitude}`,
    method: "GET",
  });
}

export function getTimelineProgress(): Promise<TimelineProgressDto> {
  return apiRequest<TimelineProgressDto>({
    path: "/story/timeline",
    method: "GET",
  });
}
