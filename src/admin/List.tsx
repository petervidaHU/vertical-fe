import React, { useState } from 'react';
import { Box, Button, Collapse, Heading, IconButton, Table, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
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
          {stories.map((story) => (<>
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
      <Box display="flex" justifyContent="center" marginTop="4">
        <Button onClick={() => setPage(page > 1 ? page - 1 : 1)} disabled={page === 1} mr="4">Previous</Button>
        <Button onClick={() => setPage(page => page + 1)}>Next</Button>
      </Box>
    </>
  );
}

export default StoriesList;
