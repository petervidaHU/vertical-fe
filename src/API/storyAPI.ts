import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { iStoryEntity } from '../types/story.interface';

const baseUrl = 'http://localhost:3000';

export const storiesApi = createApi({
  reducerPath: 'storiesApi',
  baseQuery: fetchBaseQuery({ baseUrl:  baseUrl}),
  endpoints: (builder) => ({
    fetchStories: builder.query<Array<iStoryEntity>, number>({
      query: (scroll) => ({ url: `story/pre/${scroll}` }),
    }),
    
    createStory: builder.mutation<iStoryEntity, Partial<iStoryEntity>>({
      query: (story) => ({
        url: 'story',
        method: 'POST',
        body: story,
      }),
    }),
  
    updateStory: builder.mutation<iStoryEntity, Partial<iStoryEntity>>({
      query: (story) => ({
        url: `story/${story.id}`,
        method: 'PUT',
        body: story,
      }),
    }),
  }),
});

export const {
  useFetchStoriesQuery,
  useLazyFetchStoriesQuery,
  useCreateStoryMutation,
  useUpdateStoryMutation,
} = storiesApi;
