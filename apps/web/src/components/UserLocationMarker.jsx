import React, { useMemo, useEffect, useRef } from 'react';
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

// Referencias para la interpolación suave (Lerp) de la rotación
  const bearingTarget = useRef(0);
  const currentMapBearing = useRef(0);

  // Actualizar el objetivo de la rotación de forma continua
  useEffect(() => {
    if (!enableMapRotation || !map) return;

    if (heading !== null && heading !== undefined) {
      bearingTarget.current = heading;
    } else if (userLocation && userLocation.heading) {
      bearingTarget.current = userLocation.heading;
    }
  }, [heading, userLocation?.heading, enableMapRotation, map]);

  // Bucle de renderizado 3D y Bearing
  useEffect(() => {
    if (!enableMapRotation || !map) return;

    let animationFrameId;
    let lastTime = performance.now();

    const lerpRotation = (currentTime) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      const targetPath = bearingTarget.current;
      let diff = targetPath - currentMapBearing.current;

      // Camino más corto (LERP circular)
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;

      if (Math.abs(diff) > 0.05) {
        // Factor de suavizado (Lerp) interpolado con DeltaTime
        const lerpFactor = 1 - Math.pow(0.001, deltaTime / 1000);
        currentMapBearing.current += diff * lerpFactor;
        // Normalizar
        currentMapBearing.current = ((currentMapBearing.current % 360) + 360) % 360;
      }

      // 2. Leaflet CSS Hack para aplicar el bearing (rotateZ)
      const mapPane = map.getPane('mapPane');
      if (mapPane && userLocation) {
        // Ajustamos el origen de la rotación exactamente a nuestra ubicación actual (lat, lng)
        const originPoint = map.latLngToLayerPoint([userLocation.latitude, userLocation.longitude]);
        mapPane.style.transformOrigin = `${originPoint.x}px ${originPoint.y}px`;

        // Preservamos el pan interno (translate3d) y agregamos el bearing dinámico
        const offset = mapPane._leaflet_pos || { x: 0, y: 0 };
        mapPane.style.transform = `translate3d(${offset.x}px, ${offset.y}px, 0px) rotateZ(-${currentMapBearing.current}deg)`;
      }

      // 3. Compensar el marcador para que mire siempre hacia adelante (arriba en la pantalla)
      const coneEl = document.getElementById('user-cone-container');
      if (coneEl) {
        // El mapa rotó -currentMapBearing. Para que el cono apunte hacia arriba (0 deg en pantalla),
        // rotamos el cono +currentMapBearing.
        coneEl.style.transform = `rotate(${currentMapBearing.current}deg)`;
      }

      animationFrameId = requestAnimationFrame(lerpRotation);
    };

    animationFrameId = requestAnimationFrame(lerpRotation);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [map, enableMapRotation, userLocation?.latitude, userLocation?.longitude]);

  const userIcon = useMemo(() => {
      // Usaremos un triángulo/flecha moderna estilo Google Maps con sombra estática y nítida.
      return L.divIcon({
        className: 'user-location-marker',
        html:
          '<div id="user-cone-container" style="position: relative; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; transform-origin: center center; will-change: transform; transition: transform 0.1s ease-out;">\n' +
          '  <svg width="60" height="60" viewBox="0 0 60 60" style="position: absolute; top: 0; left: 0; drop-shadow: 0px 4px 6px rgba(0,0,0,0.3);">\n' +
          '    <defs>\n' +
          '      <radialGradient id="dotGradient" cx="50%" cy="50%" r="50%">\n' +
          '        <stop offset="0%" stop-color="#4285F4" />\n' +
          '        <stop offset="100%" stop-color="#1967D2" />\n' +
          '      </radialGradient>\n' +
          '    </defs>\n' +
          '    <!-- Círculo interior base (tu propia posición) -->\n' +
          '    <circle cx="30" cy="30" r="10" fill="white" stroke="rgba(0,0,0,0.1)" stroke-width="1" />\n' +
          '    <circle cx="30" cy="30" r="7" fill="url(#dotGradient)" />\n' +
          '    <!-- Flecha apuntando rígidamente hacia adelante (Norte del SVG, Y=0) -->\n' +
          '    <path d="M 30 5 L 42 25 Q 30 20 18 25 Z" fill="#4285F4" />\n' +
          '  </svg>\n' +
          '</div>',
        iconSize: [60, 60],
        iconAnchor: [30, 30],
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
export default UserLocationMarker;