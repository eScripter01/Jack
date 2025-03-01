const { getPool } = require('./db');

/**
 * Crée la table xp_{guildId} si elle n'existe pas
 */
async function createTableIfNotExists(guildId) {
  const pool = getPool();
  const tableName = `xp_${guildId}`;
  const sql = `
    CREATE TABLE IF NOT EXISTS \`${tableName}\` (
      user_id VARCHAR(50) NOT NULL,
      xp INT DEFAULT 0,
      PRIMARY KEY (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  await pool.query(sql);
}

/**
 * Ajoute de l'XP à un utilisateur
 */
async function addXp(guildId, userId, amount) {
  const pool = getPool();
  const tableName = `xp_${guildId}`;
  // S'assurer que la table existe
  await createTableIfNotExists(guildId);

  const sql = `
    INSERT INTO \`${tableName}\` (user_id, xp)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE xp = xp + VALUES(xp)
  `;
  await pool.execute(sql, [userId, amount]);
}

/**
 * Récupère l'XP d'un utilisateur
 */
async function getUserXp(guildId, userId) {
  const pool = getPool();
  const tableName = `xp_${guildId}`;
  await createTableIfNotExists(guildId);

  const sql = `
    SELECT xp
    FROM \`${tableName}\`
    WHERE user_id = ?
  `;
  const [rows] = await pool.execute(sql, [userId]);
  if (rows.length === 0) return 0;
  return rows[0].xp;
}

/**
 * Récupère le top 10 des utilisateurs du serveur
 */
async function getTop10(guildId) {
  const pool = getPool();
  const tableName = `xp_${guildId}`;
  await createTableIfNotExists(guildId);

  const sql = `
    SELECT user_id, xp
    FROM \`${tableName}\`
    ORDER BY xp DESC
    LIMIT 10
  `;
  const [rows] = await pool.execute(sql);
  return rows; // [{user_id, xp}, ...]
}

module.exports = {
  addXp,
  getUserXp,
  getTop10,
};
