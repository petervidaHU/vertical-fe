import React, { useState } from 'react';
import { Box, Button, Collapse, Heading, IconButton, Table, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon, CloseIcon } from '@chakra-ui/icons';
import { useGetListQuery } from '../API/storyAPI';

const StoriesList: React.FC = () => {
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [showDescription, setShowDescription] = useState<{ [key: string]: boolean }>({});

  const { data: stories, isError, isLoading } = useGetListQuery({ page, limit });

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

  return (
    <>
      <Table variant="" >
        <Thead>
          <Tr>
            <Th>Title</Th>
            <Th>Start Point</Th>
            <Th>End Point</Th>
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
                />
                {' '}
                {story.title}
              </Td>
              <Td>{story.startPoint}</Td>
              <Td>{story.endPoint}</Td>

            </Tr>
            <Tr>
              <Collapse in={showDescription[story.id]}>
                <Td colSpan={4}>
                  <Box margin={1} >
                    {story.description}
                  </Box>
                </Td>
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