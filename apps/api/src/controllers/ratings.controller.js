import pool from '../config/database.js'

export const submitRating = async (req, res) => {
  try {
    const { entity_type, entity_id, score, comment } = req.body;
    // user_id might come from req.user if authentication is implemented
    const user_id = req.user?.id || 1; // Fallback to a default user for now

    if (!entity_type || !entity_id || !score) {
      return res.status(400).json({ error: 'Missing required fields: entity_type, entity_id, score' });
    }

    if (score < 1 || score > 5) {
      return res.status(400).json({ error: 'Score must be between 1 and 5' });
    }

    const query = `
      INSERT INTO ratings (entity_type, entity_id, user_id, score, comment)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (entity_type, entity_id, user_id) 
      DO UPDATE SET score = EXCLUDED.score, comment = EXCLUDED.comment, updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    const values = [entity_type, entity_id, user_id, score, comment];
    
    const result = await pool.query(query, values);

    res.status(200).json({ success: true, rating: result.rows[0] });

  } catch (error) {
    console.error('Error in submitRating:', error);
    res.status(500).json({ error: 'Database error while submitting rating' });
  }
};

export const getRatings = async (req, res) => {
  try {
    const { entity_type, entity_id } = req.params;

    const query = \`
      SELECT 
        id, user_id, score, comment, created_at, updated_at 
      FROM ratings 
      WHERE entity_type = $1 AND entity_id = $2
      ORDER BY created_at DESC;
    \`;
    const values = [entity_type, entity_id];
    
    const result = await pool.query(query, values);
    
    // Also get the average rating
    const aggQuery = \`
      SELECT AVG(score)::numeric(10,1) as average, COUNT(*) as count 
      FROM ratings 
      WHERE entity_type = $1 AND entity_id = $2;
    \`;
    
    const aggResult = await pool.query(aggQuery, values);

    res.status(200).json({ 
      success: true, 
      data: result.rows,
      meta: aggResult.rows[0]
    });

  } catch (error) {
    console.error('Error in getRatings:', error);
    res.status(500).json({ error: 'Database error while fetching ratings' });
  }
};
