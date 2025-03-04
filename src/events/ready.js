// src/events/ready.js

// Imports XP
const { addXp, getTop10 } = require('../database/xpManager');
const { getLevelFromXp } = require('../utils/levelSystem');

// Imports pour le Classement Œuvres
const { postGlobalRankingEmbed, updateGlobalRankingEmbed } = require('../utils/postRankingMessage');

// Discord.js
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

require('dotenv').config(); // Pour accéder aux vars .env

// Config XP
const XP_PER_INTERVAL = 1;             // XP à donner en vocal
const VOCAL_INTERVAL_MS = 5 * 60_000;  // 5 minutes pour le vocal
const TOP_XP_REFRESH_MS = 1 * 30_000;  // 2 minutes pour rafraîchir le top XP

// On stocke ici le message "Top 10 XP" pour pouvoir le ré-éditer
let top10Message = null;

// On stockera aussi le message "Classement Œuvres" si on veut le ré-éditer
let rankingMessage = null;

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`Bot connecté en tant que ${client.user.tag}`);

    // 1) Mettre en place le Top 10 XP
    await setupTop10Message(client);

    // 2) (Optionnel) Mettre en place le Classement Général des Œuvres
    await setupRankingMessage(client);

    // 3) Lancer l'intervalle pour mettre à jour régulièrement le Top 10 XP
    setInterval(async () => {
      await updateTop10Message(client);
    }, TOP_XP_REFRESH_MS);

    // 4) (Optionnel) Lancer un intervalle pour rafraîchir le Ranking Œuvres

    setInterval(async () => {
      if (rankingMessage) {
        // updateGlobalRankingEmbed(...) si tu as implémenté la fonction
        await updateGlobalRankingEmbed(rankingMessage);
      }
    }, TOP_XP_REFRESH_MS);

    // 5) Lancer l'intervalle pour l'XP vocal
    setInterval(async () => {
      console.log("Interval triggered! Checking voice channels...");
      
      client.guilds.cache.forEach(async (guild) => {
        guild.channels.cache
          .filter(ch => ch.isVoiceBased())
          .forEach(async (channel) => {
            // Filtrer les membres pour exclure les bots
            const realMembers = channel.members.filter(m => !m.user.bot);
            // Nombre de membres (non-bots) dans le vocal
            const nbRealMembers = realMembers.size;
            
            // Pour chaque membre non-bot présent
            for (const member of realMembers.values()) {
              // Donne "nbRealMembers" XP à chaque membre
              await addXp(guild.id, member.id, nbRealMembers);
            }
          });
      });
    }, VOCAL_INTERVAL_MS);

  },
};

/* ========================================
   1) GESTION DU TOP 10 XP
======================================== */

/**
 * - Supprime les anciens messages du bot dans XP_CHANNEL_ID
 * - Poste un nouveau message "Top 10 XP"
 * - Stocke son ID dans top10Message
 */
async function setupTop10Message(client) {
  const xpChannelId = process.env.XP_CHANNEL_ID;
  if (!xpChannelId) {
    console.warn("XP_CHANNEL_ID non configuré. Impossible de poster le top 10 XP.");
    return;
  }

  const xpChannel = await client.channels.fetch(xpChannelId).catch(() => null);
  if (!xpChannel) {
    console.warn(`Channel XP ${xpChannelId} introuvable.`);
    return;
  }

  // Supprimer les anciens messages du bot
  const fetched = await xpChannel.messages.fetch({ limit: 50 }).catch(() => null);
  if (!fetched) return;

  const botMessages = fetched.filter(msg => msg.author.id === client.user.id);
  for (const [, msg] of botMessages) {
    await msg.delete().catch(() => null);
  }

  // Poster le nouveau message "Top 10 XP"
  top10Message = await postTop10Embed(xpChannel);
}

/**
 * Crée et envoie le message "Top 10 XP" dans le channel donné
 */
async function postTop10Embed(channel) {
  const guild = channel.guild;
  const topXp = await getTop10(guild.id);

  const embed = new EmbedBuilder()
    .setTitle("Top 10 - XP")
    .setColor("#F1C40F")
    .setDescription("Voici le classement des 10 membres les plus actifs.");

  if (topXp.length === 0) {
    embed.addFields({
      name: "Aucun data",
      value: "Personne n’a encore gagné d’XP."
    });
  } else {
    topXp.forEach((row, index) => {
      const level = getLevelFromXp(row.xp);
      embed.addFields({
        name: `#${index + 1}`,
        value: `<@${row.user_id}> — **Niveau ${level}** (${row.xp} xp)`,
        inline: false
      });
    });
  }

  // Bouton "Voir mes stats"
  const btn = new ButtonBuilder()
    .setCustomId("seeMyStats")
    .setLabel("Voir mes stats")
    .setStyle(ButtonStyle.Primary)
    .setEmoji("👀");

  const row = new ActionRowBuilder().addComponents(btn);

  return channel.send({ embeds: [embed], components: [row] });
}

/**
 * Met à jour le message "Top 10 XP" (s'il existe).
 * Si le message n'existe plus, on le recrée.
 */
async function updateTop10Message(client) {
  if (!top10Message) {
    console.log("Pas de top10Message en mémoire, on relance setupTop10Message...");
    await setupTop10Message(client);
    return;
  }

  let fetchedMsg;
  try {
    fetchedMsg = await top10Message.channel.messages.fetch(top10Message.id);
  } catch (err) {
    console.log("Le message Top 10 n'existe plus, on le recrée.");
    await setupTop10Message(client);
    return;
  }

  // Refaire l'embed
  const guild = top10Message.channel.guild;
  const topXp = await getTop10(guild.id);

  const embed = new EmbedBuilder()
    .setTitle("Top 10 - XP")
    .setColor("#F1C40F");

  if (topXp.length === 0) {
    embed.setDescription("Personne n’a encore gagné d’XP.");
  } else {
    embed.setDescription("Voici le classement des 10 membres les plus actifs.");
    topXp.forEach((row, index) => {
      const level = getLevelFromXp(row.xp);
      embed.addFields({
        name: `#${index + 1}`,
        value: `<@${row.user_id}> — **Niveau ${level}** (${row.xp} xp)`,
        inline: false
      });
    });
  }

  const btn = new ButtonBuilder()
    .setCustomId("seeMyStats")
    .setLabel("Voir mes stats")
    .setStyle(ButtonStyle.Primary)
    .setEmoji("👀");

  const row = new ActionRowBuilder().addComponents(btn);

  await fetchedMsg.edit({ embeds: [embed], components: [row] });
  console.log("Top 10 XP mis à jour !");
}

/* ========================================
   2) GESTION DU CLASSEMENT GÉNÉRAL D'ŒUVRES
======================================== */

/**
 * - Supprime les anciens messages du bot dans RANKING_CHANNEL_ID
 * - Poste un nouveau message "Classement Général des Œuvres"
 * - Stocke son message dans rankingMessage
 */
async function setupRankingMessage(client) {
  const rankingChannelId = process.env.RANKING_CHANNEL_ID;
  if (!rankingChannelId) {
    console.warn("RANKING_CHANNEL_ID non configuré. Impossible de poster le Classement Œuvres.");
    return;
  }

  const rankingChannel = await client.channels.fetch(rankingChannelId).catch(() => null);
  if (!rankingChannel) {
    console.warn(`Channel Ranking ${rankingChannelId} introuvable.`);
    return;
  }

  // Supprimer les anciens messages du bot
  const fetched = await rankingChannel.messages.fetch({ limit: 50 }).catch(() => null);
  if (!fetched) return;

  const botMessages = fetched.filter(msg => msg.author.id === client.user.id);
  for (const [, msg] of botMessages) {
    await msg.delete().catch(() => null);
  }

  // Poster le message
  rankingMessage = await postGlobalRankingEmbed(rankingChannel);
}

/* 
  -- Dans postRankingMessage.js, tu as la fonction postGlobalRankingEmbed(channel)
  -- qui renvoie le message créé.
  -- Si tu veux l'éditer régulièrement, tu peux faire un updateGlobalRankingEmbed(msg) 
  -- comme pour le top XP.
*/

