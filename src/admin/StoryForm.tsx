import React, { useState } from 'react';
import { Box, Button, FormControl, FormLabel, Input, NumberInput, NumberInputField } from '@chakra-ui/react';
import { useCreateStoryMutation } from '../API/storyAPI';

export default function StoryForm() {
  const [formState, setFormState] = useState({
    title: '',
    description: '',
    startPoint: 0,
    endPoint: 0,
  });

  const [createStory, { isLoading, isError, isSuccess, data }] = useCreateStoryMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createStory(formState);
      if (isSuccess) {
        console.log('Story created successfully', data);
      }
    } catch (error) {
      console.error('Failed to create story:', error);
    }
  };

  const handleChange = (e) => {
    setFormState({
      ...formState,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <>
      <Box>
        {isLoading && (<div>is loading</div>)}
      </Box>

      <Box as='form' onSubmit={handleSubmit}>
        <FormControl id="title">
          <FormLabel>Title</FormLabel>
          <Input name='title' value={formState.title} onChange={handleChange} />
        </FormControl>

        <FormControl id="description">
          <FormLabel>Description</FormLabel>
          <Input name='description' value={formState.description} onChange={handleChange} />
        </FormControl>

        <FormControl id="startPoint">
          <FormLabel>Start Point</FormLabel>
          <NumberInput name='startPoint' value={formState.startPoint} onChange={value => handleChange({ target: { name: 'startPoint', value } })}>
            <NumberInputField />
          </NumberInput>
        </FormControl>

        <FormControl id="endPoint">
          <FormLabel>End Point</FormLabel>
          <NumberInput name='endPoint' value={formState.endPoint} onChange={value => handleChange({ target: { name: 'endPoint', value } })}>
            <NumberInputField />
          </NumberInput>
        </FormControl>

        <Button type="submit" colorScheme="blue" mt={4}>
          Submit
        </Button>
      </Box>
    </>
  );
}