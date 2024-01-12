import React, { useState } from 'react'
import Pace from './Pace';

const Settings = () => {
  const [showPace, setShowPace] = useState(false);

  return (<>
    <div
      onMouseEnter={() => setShowPace(true)}
      onMouseLeave={() => setShowPace(false)}
      className="relative z-10"
    >
      <div
        className={`absolute h-24 ${showPace ? 'top-0' : '-top-24'} left-0 right-0 transition-all duration-500 bg-blue-700 mt-0 p-4 text-white rounded-b-md shadow-md`}
      >
        <Pace />
      </div>

      <div
        className={`absolute ${showPace ? 'top-24' : 'top-0'} left-1/2 transition-all duration-500 transform -translate-x-1/2 bg-blue-700 text-white p-4 rounded-b-md shadow-md`}
      >
        Pace
      </div>

    </div>
  </>
  )
}

export default Settings;
