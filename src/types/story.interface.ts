export enum TypeOfStory {
  Story = 'story',
  Epic = 'epic',
}

export interface iStoryEntity {
  id: string,
  type: TypeOfStory,
  title: string,
  description: string,
  startPoint: number,
  endPoint: number,
}

export type sortByStories = 'title' | 'startPoint' | 'endPoint';