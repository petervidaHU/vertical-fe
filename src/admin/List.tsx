import React, { ChangeEvent, useState } from 'react';
import { useNavigate } from "react-router-dom";
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
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div>Error occurred while fetching stories.</div>;
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

  const handleTypeOfListChange = (nextValue) => {
    setTypeOfList(nextValue);
  };

  const ThSort: React.FC<{ name: sortByStories, publicName: string }> = ({ name, publicName }) => (
    <th className="relative py-2">
    {publicName}
    {' '}
    <button
      className="absolute top-1/2 translate-y-[-50%] bg-transparent border-none right-0 focus:outline-none active:bg-teal-500"
      onClick={() => toggleSort(name)}
      aria-label="Toggle Description"
    >
      {sortOrder === 'ASC' ? <ChevronUpIcon /> : <ChevronDownIcon />}
    </button>
  </th>
  )
  // BUG: type not implemented for total number of stories
  return (
    <>
     <div className="flex flex-row space-x-4">
  // radio buttons
  <label><input type="radio" value={TypeOfStory.Story} onChange={handleTypeOfListChange} checked={typeOfList === TypeOfStory.Story}/> Story</label>
  <label><input type="radio" value={TypeOfStory.Epic} onChange={handleTypeOfListChange} checked={typeOfList === TypeOfStory.Epic}/> Epic</label>
  <label><input type="radio" value="both" onChange={handleTypeOfListChange} checked={typeOfList === "both"}/> Both</label>
</div>

<table className="">
  // Table header
  <thead>
    <tr>
      <ThSort name="title" publicName="Title" />
      <ThSort name="startPoint" publicName="Start Point" />
      <ThSort name="endPoint" publicName="End Point" />
      <th className="text-right">Actions</th>
    </tr>
  </thead>
  // Table body
  <tbody>
    {stories.list.map((story) => (
    <>
      <tr key={story.id}>
        <td>
          <button
            className="border-none bg-transparent"
            onClick={() => toggleShowDescription(story.id)}
          >
            {showDescription[story.id] ? '<ChevronUpIcon />' : '<ChevronDownIcon />'}
          </button>
          {' '}
          {story.title}
        </td>
        <td>{story.startPoint}</td>
        <td>{story.endPoint}</td>
        <td>
          <button aria-label="Delete" className="rounded-full bg-red-500" onClick={() => handleDelete(story.id)}></button>
          <button aria-label="Edit" className="rounded-full bg-teal-500" onClick={() => handleEdit(story.id)}></button>
        </td>
      </tr>
      <tr style={{display: showDescription[story.id] ? "table-row" : "none"}}>
        <td colSpan={4}>
          <div className="m-1">
            {story.description}
          </div>
        </td>
      </tr>
    </>
    ))}
  </tbody>
</table>

<div className="flex wrap space-x-4">
  {/* Buttons */}
  <button onClick={() => setPage(page > 1 ? page - 1 : 1)} className="disabled:opacity-50" disabled={page === 1}>
    Prev
  </button>
  {[...Array(Math.ceil((stories.meta.total || 0) / limit))].map((_, i) => (
    <button key={i} className={`${(page === i + 1) ? 'activeButtonClass' : ''}`} onClick={() => setPage(i + 1)}>
      {i + 1}
    </button>
  ))}
  <button onClick={() => setPage(page => page + 1)} className="disabled:opacity-50" disabled={page >= stories.meta.total}>
    Next
  </button>
  <p>Total Number of Stories: {stories.meta.total || '0'}</p>

  {/* Input field */}
  <input type="number" min={1} value={limit} onChange={changeLimit} />
</div>
    </>
  );
}

export default StoriesList;
