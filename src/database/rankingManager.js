// src/database/rankingManager.js
const { getPool } = require('./db'); // ton module de connexion MySQL
const { addXp } = require('./xpManager'); // Ajoute cette ligne en haut du fichier

async function createWorksTablesIfNeeded(guildId) {
  const pool = getPool();

  const worksTable = `works_${guildId}`;
  const userWorksTable = `user_works_${guildId}`;

  // Table des œuvres
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`${worksTable}\` (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      normalized_title VARCHAR(255) NOT NULL,
      rating_count INT DEFAULT 0,
      rating_sum INT DEFAULT 0,
      average_rating FLOAT DEFAULT 0,
      UNIQUE KEY unique_title_type (normalized_title, type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Table user -> work
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`${userWorksTable}\` (
      user_id VARCHAR(50) NOT NULL,
      work_id INT NOT NULL,
      rating INT NOT NULL,
      PRIMARY KEY(user_id, work_id),
      FOREIGN KEY (work_id) REFERENCES \`${worksTable}\`(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

/**
 * Corrige la casse d'un titre. Par exemple :
 *   "my hero academia" => "My Hero Academia"
 *   "Le seigneur des anneaux" => "Le Seigneur Des Anneaux" (attention articles)
 * Ici, on fait un titre "Every Word Capitalized", un peu naïf.
 */
function autoCapitalizeTitle(str) {
  const lower = str.toLowerCase().trim();
  return lower
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.substring(1))
    .join(" ");
}

/**
 * Ajoute ou met à jour la note (rating) d'un user pour une oeuvre.
 * Crée l'oeuvre si elle n'existe pas encore.
 */
async function rateWork(guildId, userId, type, rawTitle, rating) {
  const pool = getPool();
  await createWorksTablesIfNeeded(guildId);

  const worksTable = `works_${guildId}`;
  const userWorksTable = `user_works_${guildId}`;

  // 1) Normaliser le titre
  const correctedTitle = autoCapitalizeTitle(rawTitle);
  const normalizedTitle = correctedTitle.toLowerCase();

  // 2) Vérifier si l'oeuvre existe déjà
  const [[existingWork]] = await pool.query(`
    SELECT id, rating_count, rating_sum 
    FROM \`${worksTable}\`
    WHERE normalized_title = ? AND type = ?
    LIMIT 1
  `, [normalizedTitle, type]);

  let workId;
  let ratingCount = 0;
  let ratingSum = 0;

  if (!existingWork) {
    // 3) Créer l'oeuvre
    const [insertRes] = await pool.query(`
      INSERT INTO \`${worksTable}\` (type, title, normalized_title, rating_count, rating_sum, average_rating)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [type, correctedTitle, normalizedTitle, 0, 0, 0]);
    workId = insertRes.insertId;
  } else {
    workId = existingWork.id;
    ratingCount = existingWork.rating_count;
    ratingSum = existingWork.rating_sum;
  }

  // 4) Vérifier si l'utilisateur a déjà noté cette oeuvre
  const [[existingRating]] = await pool.query(`
    SELECT rating FROM \`${userWorksTable}\`
    WHERE user_id = ? AND work_id = ?
    LIMIT 1
  `, [userId, workId]);

  if (!existingRating) {
    // Insérer la note de l'utilisateur
    await pool.query(`
      INSERT INTO \`${userWorksTable}\` (user_id, work_id, rating)
      VALUES (?, ?, ?)
    `, [userId, workId, rating]);

    // Incrémenter rating_count, ajouter rating à rating_sum
    ratingCount += 1;
    ratingSum += rating;

  } else {
    // Mettre à jour la note
    const oldRating = existingRating.rating;
    await pool.query(`
      UPDATE \`${userWorksTable}\`
      SET rating = ?
      WHERE user_id = ? AND work_id = ?
    `, [rating, userId, workId]);

    // Ajuster rating_sum
    ratingSum = ratingSum - oldRating + rating;
  }

  // 5) Recalculer average_rating = rating_sum / rating_count
  const newAverage = ratingCount > 0 ? (ratingSum / ratingCount) : 0;

  // 6) Mettre à jour l'oeuvre
  await pool.query(`
    UPDATE \`${worksTable}\`
    SET rating_count = ?,
        rating_sum = ?,
        average_rating = ?
    WHERE id = ?
  `, [ratingCount, ratingSum, newAverage, workId]);

  await addXp(guildId, userId, 5);
}

/**
 * Récupère les 3 meilleures (par moyenne) de CHAQUE catégorie demandée.
 * categories = ["Manga","Manhwa","Manhua","Serie","Film","Anime"]
 */
async function getTop3ByCategory(guildId, categories) {
  const pool = getPool();
  await createWorksTablesIfNeeded(guildId);

  const worksTable = `works_${guildId}`;
  const results = {};

  for (const cat of categories) {
    const [rows] = await pool.query(`
      SELECT title, average_rating, rating_count
      FROM \`${worksTable}\`
      WHERE type = ?
      ORDER BY average_rating DESC, rating_count DESC
      LIMIT 3
    `, [cat]);
    results[cat] = rows; // un petit tableau d'objets {title, average_rating, rating_count}
  }

  return results;
}

/**
 * Récupère TOUTES les oeuvres d'un type donné, classées par moyenne desc.
 */
async function getAllByCategory(guildId, category) {
  const pool = getPool();
  await createWorksTablesIfNeeded(guildId);

  const worksTable = `works_${guildId}`;
  const [rows] = await pool.query(`
    SELECT title, average_rating, rating_count
    FROM \`${worksTable}\`
    WHERE type = ?
    ORDER BY average_rating DESC, rating_count DESC
  `, [category]);

  return rows;
}

module.exports = {
  rateWork,
  getTop3ByCategory,
  getAllByCategory,
  createWorksTablesIfNeeded
};
