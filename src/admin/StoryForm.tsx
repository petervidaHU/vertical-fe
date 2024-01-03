import React from 'react';
import { Box, Button, FormControl, FormLabel, Input, NumberInput, NumberInputField } from '@chakra-ui/react';

export default function StoryForm({ onSubmit }) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [startPoint, setStartPoint] = React.useState('');
  const [endPoint, setEndPoint] = React.useState('');

  const handleSubmit = e => {
    e.preventDefault();
    onSubmit({ title, description, startPoint, endPoint });
  };

  return (
    <Box as="form" onSubmit={handleSubmit}>
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
        <NumberInput value={startPoint} onChange={value => setStartPoint(value)}>
          <NumberInputField />
        </NumberInput>
      </FormControl>

      <FormControl id="endPoint">
        <FormLabel>End Point</FormLabel>
        <NumberInput value={endPoint} onChange={value => setEndPoint(value)}>
          <NumberInputField />
        </NumberInput>
      </FormControl>

      <Button type="submit" colorScheme="blue" mt={4}>
        Submit
      </Button>
    </Box>
  );
}