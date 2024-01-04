import React, { FC } from 'react';
import { Box, Button, FormControl, FormLabel, Input, NumberInput, NumberInputField, Radio, RadioGroup, } from '@chakra-ui/react';
import { useOrganizeApis } from './useOrganizeApis';
import { useParams } from 'react-router-dom';

const StoryForm: FC = () => {
  const { id } = useParams()
  const { formState, setFormState, saveStory, isSuccess, isError, isLoading } = useOrganizeApis(id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await saveStory(formState);
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
        <Box padding="5">
          <RadioGroup onChange={value => handleChange({target: {name: 'type', value}})} value={formState.type}>
            <Radio value="story">Story</Radio>
            <Radio value="epic">Epic</Radio>
          </RadioGroup>
        </Box>
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
          <NumberInput name='startPoint' value={formState.startPoint} onChange={value => handleChange({ target: { name: 'startPoint', value: parseInt(value) } })}>
            <NumberInputField />
          </NumberInput>
        </FormControl>

        <FormControl id="endPoint">
          <FormLabel>End Point</FormLabel>
          <NumberInput name='endPoint' value={formState.endPoint} onChange={value => handleChange({ target: { name: 'endPoint', value: parseInt(value) } })}>
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

export default StoryForm;
