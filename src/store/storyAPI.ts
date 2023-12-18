import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { iStoryEntity } from './story.interface';

const baseUrl = 'http://localhost:3000';

export const storiesApi = createApi({
  reducerPath: 'storiesApi',
  baseQuery: fetchBaseQuery({ baseUrl:  baseUrl}),
  endpoints: (builder) => ({
    fetchStories: builder.query<Array<iStoryEntity>, number>({
      query: (scroll) => ({ url: `story/pre/${scroll}` }),
    }),
  }),
});

export const {
  useFetchStoriesQuery,
}  = storiesApi;
