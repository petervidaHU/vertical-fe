import React from 'react'
import { Link, Outlet } from 'react-router-dom';

const links = ['edit', 'list'];

const Admin = () => {
  return (<>
   <div className="p-5 border mb-10">
  <p className="text-xl">ADMIN</p>
  {links.map(link => (
    <Link to={link} key={link}>
      <p className="text-lg">{link}</p>
    </Link>
  ))}
</div>
    <Outlet />
  </>
  )
}

export default Admin