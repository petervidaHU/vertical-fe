import React from 'react';
import { Box, Button, FormControl, FormLabel, Input, NumberInput, NumberInputField } from '@chakra-ui/react';
import { storiesApi, useCreateStoryMutation } from '../API/storyAPI';

export default function StoryForm() {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [startPoint, setStartPoint] = React.useState<number>(0);
  const [endPoint, setEndPoint] = React.useState<number>(0);
  const [createStory, { isLoading, isError, isSuccess, data }] = useCreateStoryMutation();

const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    await createStory({
      title,
      description,
      startPoint,
      endPoint
    });
    if (isSuccess) {
      console.log('Story created successfully', data);
    }
  } catch (error) {
    console.error('Failed to create story:', error);
  }
};

  return (
    <Box as='form' onSubmit={handleSubmit}>
      <FormControl id="title">
        <FormLabel>Title</FormLabel>
        <Input value={title} onChange={e => setTitle(e.target.value)} />
      </FormControl>

      <FormControl id="description">
        <FormLabel>Description</FormLabel>
        <Input value={description} onChange={e => setDescription(e.target.value)} />
      </FormControl>

      <FormControl id="startPoint">
        <FormLabel>Start Point</FormLabel>
        <NumberInput value={startPoint} onChange={value => setStartPoint(parseInt(value))}>
          <NumberInputField />
        </NumberInput>
      </FormControl>

      <FormControl id="endPoint">
        <FormLabel>End Point</FormLabel>
        <NumberInput value={endPoint} onChange={value => setEndPoint(parseInt(value))}>
          <NumberInputField />
        </NumberInput>
      </FormControl>

      <Button type="submit" colorScheme="blue" mt={4}>
        Submit
      </Button>
    </Box>
  );
}