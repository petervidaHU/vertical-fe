import React from 'react';
import { Button, Text, HStack, Box } from '@chakra-ui/react';
import { useDispatch, useSelector } from 'react-redux';
import { selectPace, dividePace, multiplyPace } from '../../store/paceSlice';

const Pace = () => { 
  const dispatch = useDispatch();
  const pace = useSelector(selectPace);
  const userFriendlyPace = (p) => {
    if (p > 10) {
      return `${p / 10} km / scroll`
    }
     return `${ p * 100 } m / scroll`
    }
  
  return (
    <HStack>
      <Button onClick={() => dispatch(dividePace())}>-</Button>
      <Box>
      <Text>{userFriendlyPace(pace)}</Text>

      </Box>
      <Button onClick={() => dispatch(multiplyPace())}>+</Button>
    </HStack>
  )
}

export default Pace;
