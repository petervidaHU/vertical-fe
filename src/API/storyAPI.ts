import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { iStoryEntity } from '../types/story.interface';

interface getListProps {
  page: number,
  limit: number,
}

const baseUrl = 'http://localhost:3000';

export const storiesApi = createApi({
  reducerPath: 'storiesApi',
  baseQuery: fetchBaseQuery({ baseUrl:  baseUrl}),
  endpoints: (builder) => ({
    fetchStories: builder.query<Array<iStoryEntity>, number>({
      query: (scroll) => ({ url: `story/pre/${scroll}` }),
    }),

    getList: builder.query<Array<iStoryEntity>, getListProps>({
      query: ({page, limit}) => ({ url: `story/list?page=${page}&limit=${limit}` }),
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
  useGetListQuery,
  useLazyFetchStoriesQuery,
  useCreateStoryMutation,
  useUpdateStoryMutation,
} = storiesApi;
