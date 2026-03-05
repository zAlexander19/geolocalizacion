import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import TurnRightIcon from '@mui/icons-material/TurnRight';
import TurnLeftIcon from '@mui/icons-material/TurnLeft';
import TurnSlightRightIcon from '@mui/icons-material/TurnSlightRight';
import TurnSlightLeftIcon from '@mui/icons-material/TurnSlightLeft';
import TurnSharpRightIcon from '@mui/icons-material/TurnSharpRight';
import TurnSharpLeftIcon from '@mui/icons-material/TurnSharpLeft';
import UTurnLeftIcon from '@mui/icons-material/UTurnLeft';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import FlagIcon from '@mui/icons-material/Flag';

const toRad = x => x * Math.PI / 180;
const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const dLat = toRad(lat2-lat1);
    const dLon = toRad(lon2-lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

const getIcon = (type, modifier) => {
   const key = (modifier || type || '').toLowerCase().replace(' ', '');
   switch(key) {
      case 'left': return <TurnLeftIcon sx={{ fontSize: { xs: 32, sm: 44 }, color: 'white' }} />;
      case 'right': return <TurnRightIcon sx={{ fontSize: { xs: 32, sm: 44 }, color: 'white' }} />;
      case 'slightleft': return <TurnSlightLeftIcon sx={{ fontSize: { xs: 32, sm: 44 }, color: 'white' }} />;
      case 'slightright': return <TurnSlightRightIcon sx={{ fontSize: { xs: 32, sm: 44 }, color: 'white' }} />;
      case 'sharpleft': return <TurnSharpLeftIcon sx={{ fontSize: { xs: 32, sm: 44 }, color: 'white' }} />;
      case 'sharpright': return <TurnSharpRightIcon sx={{ fontSize: { xs: 32, sm: 44 }, color: 'white' }} />;
      case 'turnaround': case 'uturn': return <UTurnLeftIcon sx={{ fontSize: { xs: 32, sm: 44 }, color: 'white' }} />;
      case 'destinationreached': case 'arrive': return <FlagIcon sx={{ fontSize: { xs: 32, sm: 44 }, color: 'white' }} />;
      case 'straight': case 'continue': default: return <ArrowUpwardIcon sx={{ fontSize: { xs: 32, sm: 44 }, color: 'white' }} />;
   }
}

const NavigationArrow = ({ userLocation, routeInfo }) => {
  const nextStep = useMemo(() => {
    if (!userLocation || !routeInfo?.instructions || !routeInfo?.coordinates) return null;
    
    // 1. Encontrar el índice de coordenada más cercano al usuario
    let closestIndex = 0;
    let minDistance = Infinity;

    routeInfo.coordinates.forEach((coord, i) => {
        const dist = getDistance(userLocation.latitude, userLocation.longitude, coord.lat, coord.lng);
        if (dist < minDistance) {
            minDistance = dist;
            closestIndex = i;
        }
    });

    // 2. Encontrar la próxima instrucción relevante
    let nextInstruction = null;

    for (let i = 0; i < routeInfo.instructions.length; i++) {
        const instr = routeInfo.instructions[i];

        // Buscamos la instrucción que esté *después* del punto donde estamos.
        if (instr.index > closestIndex + 1) {
            nextInstruction = instr;
            break;
        }
    }

    if (!nextInstruction) {
       // Si no queda nada adelante, tomamos la última
       nextInstruction = routeInfo.instructions[routeInfo.instructions.length - 1];
    }

    if (!nextInstruction) return null;

    // Distancia areal
    const targetCoord = routeInfo.coordinates[nextInstruction.index];
    const arealDist = targetCoord
         ? getDistance(userLocation.latitude, userLocation.longitude, targetCoord.lat, targetCoord.lng)
         : nextInstruction.distance;

    return {
        ...nextInstruction,
        arealDistance: arealDist
    };

  }, [userLocation, routeInfo]);

  if (!nextStep) return null;

  const distanceText = nextStep.arealDistance < 1000
      ? Math.round(nextStep.arealDistance) + 'm'
      : (nextStep.arealDistance / 1000).toFixed(1) + 'km';

  const mainText = nextStep.text || 'Siga la ruta definida';

  return (
    <Box
      sx={{
        position: 'absolute',
        top: { xs: 8, sm: 24 },
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        backgroundColor: '#0f5132',
        borderRadius: { xs: '12px', sm: '18px' },
        padding: { xs: '10px 16px', sm: '14px 24px' },
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        gap: { xs: '12px', sm: '20px' },
        minWidth: { xs: '220px', sm: '280px' },
        maxWidth: '90%',
        color: 'white',
        border: '1px solid #157347',
        transition: 'all 0.3s ease-in-out'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
         {getIcon(nextStep.type, nextStep.modifier)}
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
         <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: { xs: '1.05rem', sm: '1.25rem' }, lineHeight: 1.2, mb: 0.5 }}>
            {mainText}
         </Typography>
         <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#86efac', fontSize: { xs: '0.9rem', sm: '1.1rem' }, letterSpacing: '0.5px' }}>
            A {distanceText}
         </Typography>
      </Box>
    </Box>
  );
};

export default NavigationArrow;
