import React, { useState } from 'react';
import { Box, Button, Collapse, Heading, IconButton, Input, Table, Tbody, Td, Text, Th, Thead, Tr, Wrap, WrapItem } from '@chakra-ui/react';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon } from '@chakra-ui/icons';
import { useGetListQuery } from '../API/storyAPI';
import { sortByStories } from '../types/story.interface';

const StoriesList: React.FC = () => {
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [showDescription, setShowDescription] = useState<{ [key: string]: boolean }>({});
  const [sortBy, setSortBy] = useState<sortByStories>('title');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  const { data: stories, isError, isLoading } = useGetListQuery({ page, limit, sortBy, sortOrder });

  const toggleSort = (name: sortByStories) => {
    setSortBy(name);
    setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
  }

  const changeLimit = (event) => {
    setLimit(event.target.value);
  };

  const toggleShowDescription = (id: string) => {
    setShowDescription(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  if (isError) {
    return <Text>Error occurred while fetching stories.</Text>;
  }

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

  return (
    <>
      <div>
        sortby: {sortBy}
      </div>
      <div>
        order: {sortOrder}
      </div>
      <Table variant="" >
        <Thead>
          <Tr>
            <ThSort name="title" publicName="Title" />
            <ThSort name="startPoint" publicName="Start Point" />
            <ThSort name="endPoint" publicName="End Point" />
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

            </Tr>
            <Tr>
              <Collapse in={showDescription[story.id]}>
                <Box margin={1} >
                  {story.description}
                </Box>
              </Collapse>
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
