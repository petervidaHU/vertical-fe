export interface iStoryEntity {
  id: string,
  title: string,
  description: string,
  startPoint: number,
  endPoint: number,
}

export type sortByStories = 'title' | 'startPoint' | 'endPoint';