const { addXp } = require('../database/xpManager');

// Pour stocker le dernier message de chaque utilisateur (cooldown)
const cooldown = new Map(); // Map<userId, timestamp>

const XP_PER_MESSAGE = 15;       // 15 XP par message
const COOLDOWN_MS = 60_000;      // 1 minute

module.exports = {
  name: 'messageCreate', // Nom de l'event
  async execute(message) {
    // 1. Ignorer les bots
    if (message.author.bot) return;

    // 2. Récupérer l'ID user et guild
    const userId = message.author.id;
    const guildId = message.guild?.id;
    // message.guild peut être null en DM ; vérifie que c'est pas un DM
    if (!guildId) return;

    // 3. Vérifier le cooldown
    const now = Date.now();
    const lastTime = cooldown.get(userId) || 0;

    if (now - lastTime < COOLDOWN_MS) {
      // Si c'est trop tôt, on ignore -> pas d'XP
      return;
    }

    // 4. Mettre à jour le cooldown
    cooldown.set(userId, now);

    // 5. Ajouter l'XP
    await addXp(guildId, userId, XP_PER_MESSAGE);
    // Optionnel : console.log pour débug
    // console.log(`Ajout de ${XP_PER_MESSAGE} XP à ${userId} sur guild ${guildId}`);
  }
};
