import React, { FC } from 'react';
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
      <div>
        {isLoading && (<div>is loading</div>)}
      </div>

      <form className="" onSubmit={handleSubmit}>
        <div className="p-5">
          {/* radio buttons */}
          <label><input type="radio" value="story" name="type" onChange={(e) => handleChange({ target: { name: 'type', value: e.target.value } })} checked={formState.type === "story"} /> Story</label>
          <label><input type="radio" value="epic" name="type" onChange={(e) => handleChange({ target: { name: 'type', value: e.target.value } })} checked={formState.type === "epic"} /> Epic</label>
        </div>
        {/* title input */}
        <label htmlFor="title">Title</label>
        <input id="title" className="block" name='title' value={formState.title} onChange={handleChange} />

        {/* description input */}
        <label htmlFor="description">Description</label>
        <input id="description" className="block" name='description' value={formState.description} onChange={handleChange} />

        {/* start point input */}
        <label htmlFor="startPoint">Start Point</label>
        <input id="startPoint" type="number" className="block" name='startPoint' value={formState.startPoint} onChange={e => handleChange({ target: { name: 'startPoint', value: parseInt(e.target.value) } })} />

        {/* end point input */}
        <label htmlFor="endPoint">End Point</label>
        <input id="endPoint" type="number" className="block" name='endPoint' value={formState.endPoint} onChange={e => handleChange({ target: { name: 'endPoint', value: parseInt(e.target.value) } })} />

        {/* submit button */}
        <button type="submit" className="bg-blue-500 text-white mt-4">
          Submit
        </button>
      </form>
    </>
  );
}

export default StoryForm;
