import pool from '../config/database.js';

export const submitRating = async (req, res) => {
  try {
    const { name, stars, description } = req.body;

    if (!name || !stars || !description) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, estrellas y descripción' });
    }

    if (stars < 1 || stars > 5) {
      return res.status(400).json({ error: 'La valoración debe estar entre 1 y 5 estrellas' });
    }

    const query = `
      INSERT INTO app_ratings (name, stars, description)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const values = [name, stars, description];

    const result = await pool.query(query, values);

    res.status(201).json({ success: true, rating: result.rows[0] });

  } catch (error) {
    console.error('Error in submitRating:', error);
    res.status(500).json({ error: 'Error al enviar la valoración' });
  }
};

export const getRatings = async (req, res) => {
  try {
    const query = `
      SELECT id, name, stars, description, created_at
      FROM app_ratings
      ORDER BY created_at DESC;
    `;

    const result = await pool.query(query);

    const aggQuery = `
      SELECT ROUND(AVG(stars), 1) as average, COUNT(*) as total_count
      FROM app_ratings;
    `;
    const aggResult = await pool.query(aggQuery);

    res.status(200).json({
      success: true,
      data: result.rows,
      stats: aggResult.rows[0]
    });

  } catch (error) {
    console.error('Error in getRatings:', error);
    res.status(500).json({ error: 'Error al obtener las valoraciones' });
  }
};
