export type typeOfStory = 'story' | 'epic';

export interface iStoryEntity {
  id: string,
  type: typeOfStory,
  title: string,
  description: string,
  startPoint: number,
  endPoint: number,
}

export type sortByStories = 'title' | 'startPoint' | 'endPoint';