// src/events/interactionCreate.js

const { getUserXp } = require('../database/xpManager');
const { getLevelFromXp, getXpToNextLevel } = require('../utils/levelSystem');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    // On ne gère que les boutons, pas les slash commands, etc.
    if (!interaction.isButton()) return;

    // Vérifier si c'est le bouton "seeMyStats"
    if (interaction.customId === "seeMyStats") {
      // Vérifier qu'on est dans un serveur
      const guildId = interaction.guild?.id;
      if (!guildId) {
        return interaction.reply({
          content: "Cette action n'est possible que sur un serveur.",
          ephemeral: true,
        });
      }

      // Récupérer l'XP de l'utilisateur
      const xp = await getUserXp(guildId, interaction.user.id);

      // Calculer le niveau
      const level = getLevelFromXp(xp);

      // (Optionnel) Calculer l'XP manquant pour le prochain niveau
      const { nextLevel, missing, isMax } = getXpToNextLevel(xp);

      if (isMax) {
        // S'il est déjà au max du tableau (niveau 50 ici)
        return interaction.reply({
          content: `Tu as **${xp}** XP, tu es niveau **${level}** (niveau maximum). Félicitations !`,
          ephemeral: true,
        });
      } else {
        return interaction.reply({
          content: `Tu as **${xp}** XP (niveau **${level}**). Il te manque encore **${missing}** XP pour atteindre le niveau **${nextLevel}** !`,
          ephemeral: true,
        });
      }
    }
  },
};
