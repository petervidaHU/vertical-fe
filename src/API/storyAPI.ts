import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { iStoryEntity } from '../types/story.interface';
import { StoriesResponse, getListProps, iTimeline, responseList } from './apiTypes';

// const baseUrl = process.env.REACT_APP_BACKEND_API;
const baseUrl = 'https://vertical-be.vercel.app/';
// const baseUrl = 'http://localhost:3000/';

export const storiesApi = createApi({
  reducerPath: 'storiesApi',
  baseQuery: fetchBaseQuery({ baseUrl: baseUrl }),
  tagTypes: ['Story'],

  endpoints: (builder) => ({
    fetchStories: builder.query<StoriesResponse, number>({
      query: (scroll) => ({ url: `story/pre/${scroll}` }),
    }),

    getOne: builder.query<iStoryEntity, string>({
      query: (id) => `story/${id}`,
    }),

    getTimeline: builder.query<iTimeline, void>({
      query: () => 'story/timeline'
    }),

    getList: builder.query<responseList, getListProps>({
      query: ({ page, limit, sortBy, sortOrder, type }) => (
        { url: `story/list?page=${page}&limit=${limit}&sort=${sortBy}&order=${sortOrder}${type ? `&type=${type}` : ''}` }
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
  useGetTimelineQuery,
  useFetchStoriesQuery,
  useGetListQuery,
  useLazyFetchStoriesQuery,
  useCreateStoryMutation,
  useUpdateStoryMutation,
  useDeleteStoryMutation,
} = storiesApi;
