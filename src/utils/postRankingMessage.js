// src/utils/postRankingMessage.js

const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
  } = require('discord.js');
  const { getTop3ByCategory } = require('../database/rankingManager');
  
  // Les 6 catégories qu'on gère
  const allCategories = ["Manga","Manhwa","Manhua","Serie","Film","Anime"];
  
  /**
   * Poste le message initial dans le channel
   * @param {TextChannel} channel - Le channel où envoyer le message
   * @returns {Promise<Message>} - Le message envoyé
   */
  async function postGlobalRankingEmbed(channel) {
    const guild = channel.guild;
    const results = await getTop3ByCategory(guild.id, allCategories);
  
    const embed = new EmbedBuilder()
      .setTitle("Classement Général des Œuvres")
      .setColor("#2ecc71")
      .setDescription("Voici le TOP 3 de chaque catégorie (moyenne sur 5).");
  
    allCategories.forEach(cat => {
      const top3 = results[cat];
      if (!top3 || top3.length === 0) {
        embed.addFields({
          name: cat,
          value: "_Aucune œuvre dans cette catégorie_",
          inline: false,
        });
      } else {
        let desc = top3
          .map((w, i) => {
            const avg = w.average_rating.toFixed(2);
            return `**#${i+1}** ${w.title} — ${avg}/5`;
          })
          .join("\n");
        embed.addFields({ name: cat, value: desc, inline: false });
      }
    });
  
    // Boutons
    const addRateBtn = new ButtonBuilder()
        .setCustomId("rank_addRate")
        .setLabel("Ajouter/Noter une œuvre")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🖊️");

    const consultBtn = new ButtonBuilder()
        .setCustomId("rank_consult")
        .setLabel("Consulter")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🔍");
  
    const row = new ActionRowBuilder().addComponents(addRateBtn, consultBtn);
  
    return await channel.send({ embeds: [embed], components: [row] });
  }
  
  /**
   * Met à jour (édite) un message existant pour afficher le classement à jour.
   * @param {Message} message - Le message contenant déjà l'embed du classement
   */
  async function updateGlobalRankingEmbed(message) {
    const guild = message.guild;
    if (!guild) {
      console.warn("Impossible de trouver la guilde à partir du message.");
      return;
    }
  
    // Récupération du top 3 à jour
    const results = await getTop3ByCategory(guild.id, allCategories);
  
    // Reconstruire l'embed
    const embed = new EmbedBuilder()
      .setTitle("Classement Général des Œuvres")
      .setColor("#2ecc71")
      .setDescription("Top 3 de chaque catégorie (moyenne sur 5).");
  
    allCategories.forEach(cat => {
      const top3 = results[cat];
      if (!top3 || top3.length === 0) {
        embed.addFields({
          name: cat,
          value: "_Aucune œuvre dans cette catégorie_",
          inline: false,
        });
      } else {
        let desc = top3
          .map((w, i) => {
            const avg = w.average_rating.toFixed(2);
            return `**#${i+1}** ${w.title} — ${avg}/5`;
          })
          .join("\n");
        embed.addFields({ name: cat, value: desc, inline: false });
      }
    });
  
    // On recrée les boutons (même customId)
    const addRateBtn = new ButtonBuilder()
      .setCustomId("rank_addRate")
      .setLabel("Ajouter/Noter une œuvre")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🖊️");
  
    const consultBtn = new ButtonBuilder()
      .setCustomId("rank_consult")
      .setLabel("Consulter")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🔍");
  
    const row = new ActionRowBuilder().addComponents(addRateBtn, consultBtn);
  
    // Éditer le message
    await message.edit({ embeds: [embed], components: [row] });
    console.log("Classement Général des Œuvres mis à jour !");
  }
  
  module.exports = {
    postGlobalRankingEmbed,
    updateGlobalRankingEmbed
  };
  