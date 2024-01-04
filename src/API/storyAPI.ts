import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { iStoryEntity, sortByStories } from '../types/story.interface';

interface getListProps {
  page: number,
  limit: number,
  sortBy: sortByStories,
  sortOrder: 'ASC' | 'DESC',
}

interface responseList {
  list: Array<iStoryEntity>,
  meta: { total: number },
}

const baseUrl = 'http://localhost:3000';

export const storiesApi = createApi({
  reducerPath: 'storiesApi',
  baseQuery: fetchBaseQuery({ baseUrl: baseUrl }),
  tagTypes: ['Story'],

  endpoints: (builder) => ({
    fetchStories: builder.query<Array<iStoryEntity>, number>({
      query: (scroll) => ({ url: `story/pre/${scroll}` }),
    }),

    getOne: builder.query<iStoryEntity, string>({
      query: (id) => `story/${id}`,
    }),

    getList: builder.query<responseList, getListProps>({
      query: ({ page, limit, sortBy, sortOrder }) => (
        { url: `story/list?page=${page}&limit=${limit}&sort=${sortBy}&order=${sortOrder}` }
      ),
      providesTags: ['Story'],
    }),

    createStory: builder.mutation<iStoryEntity, Partial<iStoryEntity>>({
      query: (story) => ({
        url: 'story',
        method: 'POST',
        body: story,
      }),
      invalidatesTags: ['Story'],
    }),

    deleteStory: builder.mutation<iStoryEntity, string>({
      query: (id) => ({
        url: `story/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Story'],
    }),
    
    updateStory: builder.mutation<iStoryEntity, Partial<iStoryEntity>>({
      query: (story) => ({
        url: `story/${story.id}`,
        method: 'PUT',
        body: story,
      }),
      invalidatesTags: ['Story'],
    }),
  }),
});

export const {
  useGetOneQuery,
  useFetchStoriesQuery,
  useGetListQuery,
  useLazyFetchStoriesQuery,
  useCreateStoryMutation,
  useUpdateStoryMutation,
  useDeleteStoryMutation,
} = storiesApi;
