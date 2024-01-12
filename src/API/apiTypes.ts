import { TypeOfStory, iStoryEntity, sortByStories } from "@type/story.interface";

export interface getListProps {
  page: number,
  limit: number,
  sortBy: sortByStories,
  sortOrder: 'ASC' | 'DESC',
  type: TypeOfStory | null,
}

export interface responseList {
  list: Array<iStoryEntity>,
  meta: { total: number },
}

export interface StoriesResponse {
  stories: Array<iStoryEntity>;
  epics: Array<iStoryEntity>;
};

export interface iLast {
  endOfTheWorld: iStoryEntity['endPoint'];
  lastId: iStoryEntity['id'];
}

export interface iTimeline {
  epics: Array<Omit<iStoryEntity, 'description' | 'type'>>;
  last: iLast;
}