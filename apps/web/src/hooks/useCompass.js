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

    // Proyección eje Y (Borde superior del teléfono)
    const yX = -cX * sZ;
    const yY = cZ * cX;

    // Proyección eje -Z (Parte trasera de la cámara)
    const zX = -cZ * sY - sZ * sX * cY;
    const zY = -sZ * sY + cZ * sX * cY;

    // Fusión de vectores: El eje Y funciona perfecto cuando está plano.
    // El eje -Z funciona perfecto cuando el usuario lo sostiene verticalmente frente a sí mismo.
    // Sumarlos evita el Gimbal Lock (singularidad matemática) sin importar la inclinación.
    const Vx = yX + zX;
    const Vy = yY + zY;

    // Calcular el ángulo usando la función atan2 (protegida contra divisiones por cero)
    // Se invierten los parámetros porque para brújulas Norte(Y) = 0°, Este(X) = 90°
    let compassHeading = Math.atan2(Vx, Vy) * (180 / Math.PI);

    // Normalizar a 360 grados
    if (compassHeading < 0) {
        compassHeading += 360;
    }

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
        let isAbsoluteSupported = false;

        const handler = (e) => {
            // Prevenir doble ejecución (Android dispara ambos eventos al mismo tiempo)
            // Si procesamos los dos, la memoria rebota entre dos valores distintos y causa el molesto "tick"
            if (e.type === 'deviceorientationabsolute') {
                isAbsoluteSupported = true;
            } else if (e.type === 'deviceorientation' && isAbsoluteSupported) {
                return; // Ignoramos el evento relativo si el absoluto funciona
            }

            let actualHeading = null;
            
            // iOS nos da el valor ya súper pulido con webkitCompassHeading
            if (e.webkitCompassHeading !== undefined && e.webkitCompassHeading !== null) {
                actualHeading = e.webkitCompassHeading;
            } 
            // Para Android y Chrome comprobamos si es absoluto. 
            // En teléfonos modernos, e.alpha ya viene compensado por el OS (Sensor Fusion)
            // Hacer trigonometría manual sobre alpha/beta/gamma suele causar "Gimbal Lock"
            // (vueltas locas) cuando el teléfono se sostiene en vertical.
            else if (e.absolute && e.alpha !== null) {
                // Compensar orientación de pantalla (Portrait/Landscape)
                const windowOrientation = window.screen?.orientation?.angle || window.orientation || 0;
                actualHeading = (360 - e.alpha + windowOrientation) % 360;
            } 
            // Fallback
            else if (e.alpha !== null) {
                const windowOrientation = window.screen?.orientation?.angle || window.orientation || 0;
                actualHeading = (360 - e.alpha + windowOrientation) % 360;
            }

            if (actualHeading !== null) {
                // Nos aseguramos que sea siempre [0, 360)
                actualHeading = actualHeading % 360;
                if (actualHeading < 0) actualHeading += 360;

                setLastHeading(prev => {
                    if (prev === null) {
                        setHeading(actualHeading);
                        setAccumulatedHeading(actualHeading);
                        return actualHeading;
                    }

                    // Calcular la diferencia más corta
                    let diff = actualHeading - prev;
                    if (diff > 180) diff -= 360;
                    if (diff < -180) diff += 360;

                    // Ignorar la "basura" electromagnética cuando uno está quieto y el sensor salta aleatoriamente.
                    const absDiff = Math.abs(diff);

                    let smoothingFactor = 0.05; // Fluidez base

                    // Si el sensor emite un "glitch" brutal (más de 40 grados en menos de 16 milisegundos 
                    // cuando alguien la tiene en la mano es matemáticamente imposible girar así de rápido)
                    if (absDiff > 40) {
                        smoothingFactor = 0.005; // Lo frenamos casi al 100% como mecanismo de defensa
                    } else if (absDiff < 2.0) {
                        smoothingFactor = 0.01; // Suavizar el pequeño pulso orgánico
                    } else {
                        smoothingFactor = 0.08; // Transición normal y suave
                    }

                    const smoothedDiff = diff * smoothingFactor;
                    const newHeading = prev + smoothedDiff;
                    
                    // Actualizamos siempre la memoria y rotación acumulada limpia para animaciones
                    setAccumulatedHeading(acc => acc + smoothedDiff);

                    // Histéresis Visual (Deadband Visual): 
                    // El valor numérico SIEMPRE fluye sin detenerse por detrás, 
                    // pero a la PANTALLA de React solo se lo mandamos si el cambio real supera 1.5 grados.
                    // Esto mata TOTALMENTE el efecto "tic" o "parpadeo" que experimentabas estando quieto.
                    setHeading(currentRendered => {
                        if (currentRendered === null) return (newHeading % 360 + 360) % 360;
                        
                        let renderDiff = newHeading - currentRendered;
                        if (renderDiff > 180) renderDiff -= 360;
                        if (renderDiff < -180) renderDiff += 360;
                        
                        if (Math.abs(renderDiff) > 1.5) {
                            return (newHeading % 360 + 360) % 360;
                        }
                        return currentRendered;
                    });
                    
                    // Devolvemos el valor fluido, así no creamos "efecto escalera" o ticks en la memoria
                    return newHeading;
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
