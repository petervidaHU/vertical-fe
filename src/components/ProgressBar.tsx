import { iStoryEntity } from '@type/story.interface';
import React, { useState, useEffect, ReactNode } from 'react';

interface Props {
  epics: Array<Omit<iStoryEntity, 'description' | 'type'>>,
  height: number,
  end: number,
}

const ProgressBar: React.FC<Props> = ({
  epics,
  height,
  end,
}) => {
  const [epicBar, setEpicBar] = useState<Array<ReactNode>>([]);

  useEffect(() => {
    let lastBorder = 0;
    // TODO: use fix colors
    const randomColor = () => {
      const r = Math.floor(Math.random() * 255);
      const g = Math.floor(Math.random() * 255);
      const b = Math.floor(Math.random() * 255);
      return `rgb(${r}, ${g}, ${b})`;
    };

    setEpicBar(epics.map((epic) => {
      const { startPoint, endPoint } = epic;

      let top = height * ((endPoint - startPoint)/ end);
      let bottom = height - Math.ceil(height * (endPoint / end));

      if (lastBorder === bottom) {
        bottom++
      };

      if (top === bottom) {
        top++;
      };

      lastBorder = top;

      return (
        <rect
          onMouseEnter={() => { console.log(epic.title) }}
          key={epic.id}
          x="10"
          y={bottom}
          width="10"
          height={top}
          fill={randomColor()}
        />
      );
    }));
  }, [epics, height, end])

  return epicBar;
};

export default ProgressBar;