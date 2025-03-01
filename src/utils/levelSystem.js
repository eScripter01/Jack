// src/utils/levelSystem.js

/**
 * thresholds[level - 1] = xp cumulé requis pour atteindre ce niveau.
 * Ex: thresholds[0] = 0  => Level 1
 *     thresholds[1] = 100 => Level 2 (il faut 100 XP au total pour être niveau 2)
 */
const thresholds = [
    0,    100,  300,  600,  1000, 1500, 2100, 2800, 3600, 4500,
    5500, 6600, 7800, 9100, 10500,12000,13600,15300,17100,19000,
    21000,23100,25300,27600,30000,32500,35100,37800,40600,43500,
    46500,49600,52800,56100,59500,63000,66600,70300,74100,78000,
    82000,86100,90300,94600,99000,103500,108100,112800,117600,122500
  ];
  
  /**
   * Calcule le niveau correspondant à l'XP donnée, sur un total de 50 niveaux.
   * @param {number} xp
   * @returns {number} le niveau (entre 1 et 50)
   */
  function getLevelFromXp(xp) {
    let level = 1;
    for (let i = 0; i < thresholds.length; i++) {
      if (xp >= thresholds[i]) {
        level = i + 1; 
      } else {
        break;
      }
    }
    // Si un joueur dépasse le dernier palier, il reste au niveau 50
    return Math.min(level, thresholds.length);
  }
  
  /**
   * Donne des infos sur l'XP nécessaire pour atteindre le prochain niveau.
   * @param {number} xp
   * @returns {Object} { nextLevel, missing, isMax }
   *   - nextLevel : le niveau qu'on peut atteindre
   *   - missing : l'XP qu'il manque pour atteindre ce nextLevel
   *   - isMax : true si on est déjà au niveau maximum
   */
  function getXpToNextLevel(xp) {
    const currentLevel = getLevelFromXp(xp);
  
    // Si on est déjà au max (niveau 50)
    if (currentLevel >= thresholds.length) {
      return {
        nextLevel: currentLevel,
        missing: 0,
        isMax: true,
      };
    }
  
    // XP requis pour le prochain niveau (index = currentLevel)
    // Par ex, si on est level 2 => thresholds[2 - 1] = thresholds[1] = 100 => xp pour lvl 2
    const xpForNextLevel = thresholds[currentLevel]; 
    const missing = xpForNextLevel - xp;
  
    return {
      nextLevel: currentLevel + 1,
      missing,
      isMax: false,
    };
  }
  
  module.exports = {
    getLevelFromXp,
    getXpToNextLevel,
    thresholds,
  };
  