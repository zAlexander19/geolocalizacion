import { useState, useEffect } from 'react';

const isIOS = () => {
    return [
      'iPad Simulator',
      'iPhone Simulator',
      'iPod Simulator',
      'iPad',
      'iPhone',
      'iPod'
    ].includes(navigator.platform)
    || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
};

// Algoritmo matemático para extrapolar con precisión el norte 
// cuando el celular no está completamente plano sobre una mesa (pitch y roll)
const computeAccurateHeading = (alpha, beta, gamma) => {
    if (alpha === null || beta === null || gamma === null) return 360 - (alpha || 0);

    const degToRad = Math.PI / 180;
    const _x = beta * degToRad; // Pitch inclinación hacia adelante/atrás
    const _y = gamma * degToRad; // Roll inclinación lateral
    const _z = alpha * degToRad; // Rotación sobre el eje z

    const cX = Math.cos(_x);
    const cY = Math.cos(_y);
    const cZ = Math.cos(_z);
    const sX = Math.sin(_x);
    const sY = Math.sin(_y);
    const sZ = Math.sin(_z);

    // Calcular vector de apuntado tridimensional
    const Vx = -cZ * sY - sZ * sX * cY;
    const Vy = -sZ * sY + cZ * sX * cY;

    let compassHeading = Math.atan(Vx / Vy);

    // Convertir de radianes a grados y normalizar semi-círculo a círculo 360
    if (Vy < 0) {
        compassHeading += Math.PI;
    } else if (Vx < 0) {
        compassHeading += 2 * Math.PI;
    }
    compassHeading = compassHeading * (180 / Math.PI);

    // Compensar en caso de girar la pantalla (Portrait a Landscape)
    const windowOrientation = window.screen?.orientation?.angle || window.orientation || 0;
    compassHeading += windowOrientation;

    return compassHeading;
};

export const useCompass = () => {
    const [heading, setHeading] = useState(null);
    const [accumulatedHeading, setAccumulatedHeading] = useState(0);
    const [lastHeading, setLastHeading] = useState(null);
    const [needsPermission, setNeedsPermission] = useState(isIOS());
    const [error, setError] = useState(null);

    const requestAccess = async () => {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission === 'granted') {
                    setNeedsPermission(false);
                    startListening();
                } else {
                    setError('Permiso denegado para la brújula');
                }
            } catch (err) {
                setError(err.message);
            }
        } else {
            setNeedsPermission(false);
            startListening();
        }
    };

    const startListening = () => {
        const handler = (e) => {
            let actualHeading = null;
            
            // iOS nos da el valor ya súper pulido con webkitCompassHeading
            if (e.webkitCompassHeading !== undefined && e.webkitCompassHeading !== null) {
                actualHeading = e.webkitCompassHeading;
            } 
            // Para Android y Chrome usamos nuestro cálculo matemático 3D absoluto
            else if (e.absolute && e.alpha !== null) {
                actualHeading = computeAccurateHeading(e.alpha, e.beta, e.gamma);
            } 
            // Fallback si "absolute" falla (giroscopio emulado sin brújula magnética nativa)
            else if (e.alpha !== null) {
                actualHeading = computeAccurateHeading(e.alpha, e.beta, e.gamma);
            }

            if (actualHeading !== null) {
                // Nos aseguramos que sea siempre [0, 360)
                actualHeading = actualHeading % 360;
                if (actualHeading < 0) actualHeading += 360;

                // Entregamos el dato 100% puro para máxima precisión.
                // El suavizado visual ya lo hace requestAnimationFrame con Lerp en UserLocationMarker.jsx
                setHeading(actualHeading);

                setLastHeading(prev => {
                    if (prev === null) {
                        setAccumulatedHeading(lastFilteredHeading);
                        return lastFilteredHeading;
                    }

                    // Calcular la diferencia más corta
                    let diff = lastFilteredHeading - prev;
                    if (diff > 180) diff -= 360;
                    if (diff < -180) diff += 360;

                    // Acumular la rotación continua para evitar saltos 359->0 en animaciones
                    setAccumulatedHeading(acc => acc + diff);
                    return lastFilteredHeading;
                });
            }
        };

        window.addEventListener('deviceorientationabsolute', handler, true);
        window.addEventListener('deviceorientation', handler, true);

        return () => {
            window.removeEventListener('deviceorientationabsolute', handler, true);
            window.removeEventListener('deviceorientation', handler, true);
        };
    };

    useEffect(() => {
        if (!needsPermission) {
            const cleanup = startListening();
            return cleanup;
        }
    }, [needsPermission]);

    return { heading, accumulatedHeading, needsPermission, requestAccess, error };
};
