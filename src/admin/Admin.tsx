import React from 'react'
import { Box, Text } from "@chakra-ui/react";
import { Link, Outlet } from 'react-router-dom';

const links = ['edit'];

const Admin = () => {
  return (<>
    <Box p="5" borderWidth="1px" marginBlockEnd={10}>
      <Text fontSize="xl">ADMIN</Text>
      {links.map(link => (
        <Link to={link} key={link}>
          <Text fontSize="lg">{link}</Text>
        </Link>
      ))}
    </Box>
    <Outlet />
  </>
  )
}

export default Admin