import React, { useState, useEffect } from 'react';
import { useGetOneQuery, useUpdateStoryMutation, useCreateStoryMutation } from "../API/storyAPI";
import { iStoryEntity } from '../types/story.interface';

export const useOrganizeApis = (id: string) => {
  const [formState, setFormState] = useState<Omit<iStoryEntity, 'id'> | iStoryEntity>({ 
    title: "",
    description: "",
    startPoint: 0,
    endPoint: 0,
  });

  const [updateStory, { isLoading: isUpdateLoading, isError: isUpdateError, isSuccess: isUpdateSuccess }] = useUpdateStoryMutation();

  const [createStory, { isLoading: isCreateLoading, isError: isCreateError, isSuccess: isCreateSuccess }] = useCreateStoryMutation();

  const { data: initialData = null, isLoading: isInitialLoading } = useGetOneQuery(id, {skip: !id});

  const saveStory = id ? updateStory : createStory;

  const isLoading = isInitialLoading || isUpdateLoading || isCreateLoading;
  const isError = isUpdateError || isCreateError;
  const isSuccess = isUpdateSuccess || isCreateSuccess;

  useEffect(() => {
      if (initialData) {
          setFormState({ ...initialData });
      }
  }, [initialData]);

   return { formState, setFormState, saveStory, isLoading, isError, isSuccess };
};