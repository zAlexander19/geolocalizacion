import React, { useState, useEffect } from 'react';
import { Modal, Box, Backdrop, Fade } from '@mui/material';
import api from '../lib/api';

export default function RatingModal({ open, onClose }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorText, setErrorText] = useState('');

  if (!open) return null;

  const handleSubmit = async () => {
    if (!name.trim() || !description.trim() || rating === 0) {
      setErrorText('Por favor, completa todos los campos y selecciona una valoración.');
      return;
    }

    setSubmitting(true);
    setErrorText('');

    try {
      const response = await api.post('/ratings', {
        name: name.trim(),
        stars: rating,
        description: description.trim()
      });

      if (!response.data || !response.data.success) {
        throw new Error('Error al enviar la valoración');
      }

      setSuccess(true);
      localStorage.setItem('geo_campus_has_rated', 'true');
      
      // Close after a brief delay
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setRating(0);
        setName('');
        setDescription('');
      }, 2000);
      
    } catch (error) {
      console.error(error);
      setErrorText('Ocurrió un error. Por favor intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    // Optionally let them cancel but don't mark as rated
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      closeAfterTransition
      disablePortal={false}
      disableEnforceFocus
      disableAutoFocus
      slots={{ backdrop: Backdrop }}
      slotProps={{
        backdrop: {
          timeout: 500,
          sx: { backgroundColor: 'rgba(11, 34, 57, 0.7)' }
        },
      }}
      sx={{ zIndex: 9999999 }} // Ensures it is above literally everything else
    >
      <Fade in={open}>
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'calc(100% - 32px)',
          maxWidth: 440,
          maxHeight: '90vh',
          overflowY: 'auto',
          outline: 'none',
          boxSizing: 'border-box',
          backgroundColor: '#0b2239',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          color: 'white',
          fontFamily: 'sans-serif',
          padding: { xs: '24px', sm: '32px' }
        }}>
          <div style={{ width: '100%' }}>
          
          <div style={{ marginBottom: '24px', backgroundColor: 'rgba(30, 144, 255, 0.2)', padding: '16px', borderRadius: '50%', color: '#1e90ff', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '72px', height: '72px', margin: '0 auto 24px auto' }}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: '40px', height: '40px' }}>
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
          </div>

          <header style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>¿Qué te parece Geo-Campus?</h1>
            <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: '1.5' }}>
              Tu opinión nos ayuda a mejorar la experiencia de navegación en el campus.
            </p>
          </header>

          {success ? (
            <div style={{ marginBottom: '24px', color: '#4ade80', fontWeight: 'bold', fontSize: '18px' }}>
              ¡Gracias por tu valoración!
            </div>
          ) : (
            <div style={{ width: '100%', marginBottom: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', marginBottom: '24px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <label 
                    key={star} 
                    style={{ padding: '8px', cursor: 'pointer', color: (hoverRating || rating) >= star ? '#fbbf24' : '#4b5563', transition: 'color 0.2s' }}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    <input
                      type="radio"
                      name="rating"
                      value={star}
                      style={{ display: 'none' }}
                      onChange={() => setRating(star)}
                    />
                    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '40px', height: '40px' }}>
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </label>
                ))}
              </div>

<div style={{ textAlign: 'left', marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }} htmlFor="name">Nombre</label>
                <input
                  style={{ width: '100%', backgroundColor: '#152a3f', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontSize: '14px', padding: '12px', outline: 'none', boxSizing: 'border-box' }}
                  id="name"
                  placeholder="Tu nombre..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div style={{ textAlign: 'left', marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }} htmlFor="feedback">Descripción breve</label>
                <textarea
                  style={{ width: '100%', backgroundColor: '#152a3f', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontSize: '14px', padding: '12px', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                  id="feedback"
                  placeholder="Comparte tus comentarios adicionales..."
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                ></textarea>
              </div>

              {errorText && <p style={{ color: '#f87171', fontSize: '14px', marginTop: '8px', textAlign: 'left' }}>{errorText}</p>}
            </div>
          )}

          {!success && (
            <footer style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
              <button 
                onClick={handleSubmit} 
                disabled={submitting}
                style={{ width: '100%', padding: '14px', backgroundColor: '#1f8fff', color: 'white', fontWeight: '600', borderRadius: '8px', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.5 : 1, fontSize: '16px' }}
                type="button"
              >
                {submitting ? 'Enviando...' : 'Enviar Valoración'}
              </button>
              <button
                onClick={handleClose}
                style={{ fontSize: '14px', color: '#94a3b8', background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none' }}
              >
                Ahora no
              </button>
            </footer>
          )}
        </div>
      </Box>
      </Fade>
    </Modal>
  );
}
