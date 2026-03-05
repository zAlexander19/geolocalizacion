const fs = require('fs');

const content = `import React, { useMemo, useEffect, useRef } from 'react';
import { Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useCompass } from '../hooks/useCompass';

const UserLocationMarker = ({ userLocation, enableMapRotation = false }) => {
  const map = useMap();
  const { heading, accumulatedHeading, needsPermission, requestAccess } = useCompass();
  const lastPanTime = useRef(Date.now());

  useEffect(() => {
    if (enableMapRotation && map && userLocation) {
        const now = Date.now();
        if (now - lastPanTime.current > 1000) {
            map.panTo([userLocation.latitude, userLocation.longitude], { animate: true, duration: 0.5 });
            lastPanTime.current = now;
        }
    }
  }, [userLocation?.latitude, userLocation?.longitude, map, enableMapRotation]);

  useEffect(() => {
      const updateConeRotation = () => {
          const el = document.getElementById('user-cone-container');
          if (el) {
              const bearing = (map && typeof map.getBearing === 'function') ? map.getBearing() : 0;
              let absHeading = 0;
              if (accumulatedHeading !== null && accumulatedHeading !== undefined) {
                  absHeading = accumulatedHeading;
              } else if (userLocation && userLocation.heading) {
                  absHeading = userLocation.heading;
              }
              const result = absHeading - bearing;
              el.style.transform = \\\`rotate(\\\${result}deg)\\\`;
          }
      };

      if (map) {
          map.on('rotate', updateConeRotation);
          map.on('move', updateConeRotation);
          map.on('zoom', updateConeRotation);
      }
      let syncInterval = setInterval(updateConeRotation, 30);
      return () => {
          clearInterval(syncInterval);
          if (map) {
              map.off('rotate', updateConeRotation);
              map.off('move', updateConeRotation);
              map.off('zoom', updateConeRotation);
          }
      };
  }, [map, accumulatedHeading, userLocation?.heading]);

  const userIcon = useMemo(() => {
    return L.divIcon({
      className: 'user-location-marker',
      html: 
        '<div id="user-cone-container" style="position: relative; width: 90px; height: 90px; display: flex; align-items: center; justify-content: center; transform-origin: center center; will-change: transform;">\\n' +
        '  <svg width="90" height="90" viewBox="0 0 90 90" style="position: absolute; top: 0; left: 0;">\\n' +
        '    <defs>\\n' +
        '      <linearGradient id="coneGradient" x1="0%" y1="100%" x2="0%" y2="0%">\\n' +
        '        <stop offset="0%" stop-color="rgba(66, 133, 244, 0)" />\\n' +
        '        <stop offset="100%" stop-color="rgba(66, 133, 244, 0.45)" />\\n' +
        '      </linearGradient>\\n' +
        '    </defs>\\n' +
        '    <path d="M 45 45 L 18 15 A 40 40 0 0 1 72 15 Z" fill="url(#coneGradient)" stroke="none" />\\n' +
        '  </svg>\\n' +
        '  <div style="width: 22px; height: 22px; background-color: #4285F4; border: 3.5px solid white; border-radius: 50%; box-shadow: 0 0 6px rgba(0,0,0,0.5); position: relative; z-index: 2;"></div>\\n' +
        '</div>',
      iconSize: [90, 90],
      iconAnchor: [45, 45],
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!userLocation) return null;

  return (
    <>
      <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userIcon} zIndexOffset={1000} />
      {needsPermission && enableMapRotation && (
         <div style={{ position: 'absolute', top: '80px', right: '10px', zIndex: 1000, background: 'white', padding: '8px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)', cursor: 'pointer' }} onClick={requestAccess}>
            Activar Brújula
         </div>
      )}
    </>
  );
};
export default UserLocationMarker;`;

fs.writeFileSync('C:/Users/123/Desktop/geolocalizacion/apps/web/src/components/UserLocationMarker.jsx', content.replace(/\\\\\\\\\\\`/g, '\`').replace(/\\\\\\\`/g, '\`'));
console.log('File written successfully.');
