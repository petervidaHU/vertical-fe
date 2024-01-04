import React, { ChangeEvent, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { Box, Button, IconButton, Input, Radio, RadioGroup, Stack, Table, Tbody, Td, Text, Th, Thead, Tr, Wrap, WrapItem } from '@chakra-ui/react';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, DeleteIcon, EditIcon } from '@chakra-ui/icons';
import { useDeleteStoryMutation, useGetListQuery } from '../API/storyAPI';
import { sortByStories, TypeOfStory } from '../types/story.interface';

type checkBoxType = TypeOfStory | 'both';

const StoriesList: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [showDescription, setShowDescription] = useState<{ [key: string]: boolean }>({});
  const [sortBy, setSortBy] = useState<sortByStories>('title');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [typeOfList, setTypeOfList] = useState<checkBoxType>(TypeOfStory.Story);

  const type = typeOfList === 'both' ? null : typeOfList;

  const { data: stories, isError, isLoading } = useGetListQuery({ page, limit, sortBy, sortOrder, type });
  const [deleteStory] = useDeleteStoryMutation();

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  if (isError) {
    return <Text>Error occurred while fetching stories.</Text>;
  }

  const toggleSort = (name: sortByStories) => {
    setSortBy(name);
    setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
  }
  // BUG: bug if empty or not number
  const changeLimit = (event: ChangeEvent<HTMLInputElement>) => {
    setLimit(event.target.value as unknown as number);
  };

  const toggleShowDescription = (id: string) => {
    setShowDescription(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleEdit = (id: string) => {
    navigate(`/admin/edit/${id}`);
  };

  const handleDelete = async (id: string) => {
    try {
      deleteStory(id);
    } catch (error) {
      console.error(error)
    }
  };

  const handleTypeOfListChange = (nextValue: checkBoxType) => {
    setTypeOfList(nextValue);
  };

  const ThSort: React.FC<{ name: sortByStories, publicName: string }> = ({ name, publicName }) => (
    <Th>
      {publicName}
      {' '}
      <IconButton
        aria-label="Toggle Description"
        size="sm"
        icon={sortOrder === 'ASC' ? <ChevronUpIcon /> : <ChevronDownIcon />}
        onClick={() => toggleSort(name)}
        variant="ghost"
        colorScheme="teal"
      />
    </Th>
  )
  // BUG: type not implemented for total number of stories
  return (
    <>
      <RadioGroup onChange={handleTypeOfListChange} value={typeOfList}>
        <Stack direction="row">
          <Radio value={TypeOfStory.Story}>Story</Radio>
          <Radio value={TypeOfStory.Epic}>Epic</Radio>
          <Radio value="both">Both</Radio>
        </Stack>
      </RadioGroup>

      <Table variant="" >
        <Thead>
          <Tr>
            <ThSort name="title" publicName="Title" />
            <ThSort name="startPoint" publicName="Start Point" />
            <ThSort name="endPoint" publicName="End Point" />
            <Th isNumeric>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {stories.list.map((story) => (<>
            <Tr key={story.id}>
              <Td>
                <IconButton
                  aria-label="Toggle Description"
                  size="sm"
                  icon={showDescription[story.id] ? <ChevronUpIcon /> : <ChevronDownIcon />}
                  onClick={() => toggleShowDescription(story.id)}
                  variant="ghost"
                />
                {' '}
                {story.title}
              </Td>
              <Td>{story.startPoint}</Td>
              <Td>{story.endPoint}</Td>
              <Td>
                <IconButton aria-label="Delete" icon={<DeleteIcon />} isRound={true} colorScheme="red" onClick={() => handleDelete(story.id)} />
                <IconButton aria-label="Edit" icon={<EditIcon />} isRound={true} colorScheme="teal" onClick={() => handleEdit(story.id)} />
              </Td>

            </Tr>
            <Tr display={showDescription[story.id] ? "table-row" : "none"}>
              <Td colSpan={4}>
                <Box margin={1} >
                  {story.description}
                </Box>
              </Td>
            </Tr>
          </>
          ))}
        </Tbody>
      </Table>

      <Wrap spacing="4">
        <Button onClick={() => setPage(page > 1 ? page - 1 : 1)} leftIcon={<ChevronLeftIcon />} isDisabled={page === 1}>
          Prev
        </Button>
        {[...Array(Math.ceil((stories.meta.total || 0) / limit))].map((_, i) => (
          <WrapItem key={i}>
            <Button onClick={() => setPage(i + 1)} isActive={page === i + 1}>
              {i + 1}
            </Button>
          </WrapItem>
        ))}
        <Button onClick={() => setPage(page => page + 1)} rightIcon={<ChevronRightIcon />} isDisabled={page >= stories.meta.total || true}>
          Next
        </Button>
        <Text>Total Number of Stories: {stories.meta.total || '0'}</Text>

        <Input type="number" min={1} value={limit} onChange={changeLimit} />
      </Wrap>
    </>
  );
}

export default StoriesList;
