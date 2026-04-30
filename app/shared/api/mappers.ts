import { Story, StoryDto } from "./types";

export function mapStoryDtoToDomain(dto: StoryDto): Story {
  return {
    id: dto.id,
    title: dto.title,
    epicTitle: dto.epicTitle ?? "",
    isPassed: Boolean(dto.passed),
  };
}

export function mapStoriesDtoToDomain(dtos: StoryDto[]): Story[] {
  return dtos.map(mapStoryDtoToDomain);
}
