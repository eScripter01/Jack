// src/events/rankingInteractions.js

const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
  } = require('discord.js');
  
  const { rateWork, getAllByCategory } = require('../database/rankingManager');
  
  // Les 6 catégories qu'on gère
  const allCategories = ["Manga","Manhwa","Manhua","Serie","Film","Anime"];
  
  module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
      // 1) Bouton "Ajouter/Noter une œuvre" => on montre un Select Menu
      if (interaction.isButton() && interaction.customId === "rank_addRate") {
        // Créer un select menu
        const select = new StringSelectMenuBuilder()
          .setCustomId("rank_addRateSelect")
          .setPlaceholder("Choisir une catégorie");
  
        // Ajouter les options
        allCategories.forEach(cat => {
          select.addOptions(
            new StringSelectMenuOptionBuilder()
              .setLabel(cat)
              .setValue(cat)
              .setEmoji(
                cat === "Manga" ? "🇯🇵" :
                cat === "Manhwa" ? "🇰🇷" :
                cat === "Manhua" ? "🇨🇳" :
                cat === "Serie"  ? "🎞️" :
                cat === "Film"   ? "🎬" :
                cat === "Anime"  ? "🔥" :
                "❓"
              )
          );
        });
  
        const row = new ActionRowBuilder().addComponents(select);
  
        return interaction.reply({
          content: "Dans quelle catégorie veux-tu noter une œuvre ?",
          components: [row],
          ephemeral: true
        });
      }
  
      // 2) Sélection d'une catégorie pour l'ajout => on ouvre un modal
      if (interaction.isStringSelectMenu() && interaction.customId === "rank_addRateSelect") {
        const chosenCat = interaction.values[0]; // la valeur sélectionnée
  
        // Construire un modal
        const modal = new ModalBuilder()
          .setCustomId("rank_addRateModal|" + chosenCat) // on encode la catégorie dans le customId
          .setTitle("Ajouter/Noter une œuvre");
  
        // Champ titre de l'oeuvre
        const titleInput = new TextInputBuilder()
          .setCustomId("workTitle")
          .setLabel("Titre de l'œuvre")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Ex: One Piece")
          .setRequired(true);
  
        // Champ note
        const ratingInput = new TextInputBuilder()
          .setCustomId("workRating")
          .setLabel("Note (1 à 5)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);
  
        const row1 = new ActionRowBuilder().addComponents(titleInput);
        const row2 = new ActionRowBuilder().addComponents(ratingInput);
  
        modal.addComponents(row1, row2);
  
        return interaction.showModal(modal);
      }
  
      // 3) Soumission du modal
      if (interaction.isModalSubmit() && interaction.customId.startsWith("rank_addRateModal")) {
        // Récupérer la catégorie encodée
        const splitted = interaction.customId.split("|");
        const category = splitted[1];
  
        const title = interaction.fields.getTextInputValue("workTitle");
        const ratingStr = interaction.fields.getTextInputValue("workRating");
        const rating = parseInt(ratingStr, 10);
  
        if (isNaN(rating) || rating < 1 || rating > 5) {
          return interaction.reply({
            content: "La note doit être un entier entre 1 et 5.",
            ephemeral: true
          });
        }
  
        // Appeler la fonction pour noter
        await rateWork(interaction.guildId, interaction.user.id, category, title, rating);
  
        // Répondre
        await interaction.reply({
          content: `Merci ! Tu as noté **${title}** (catégorie **${category}**) : ${rating}/5`,
          ephemeral: true
        });
  
        // (Optionnel) Mettre à jour le message global (embed) ici si tu le souhaites.
        return;
      }
  
      // 4) Bouton "Consulter" => on affiche un Select Menu de catégorie
      if (interaction.isButton() && interaction.customId === "rank_consult") {
        const select = new StringSelectMenuBuilder()
          .setCustomId("rank_consultSelect")
          .setPlaceholder("Choisir une catégorie");
  
        allCategories.forEach(cat => {
          select.addOptions(
            new StringSelectMenuOptionBuilder()
              .setLabel(cat)
              .setValue(cat)
              .setEmoji(
                cat === "Manga" ? "🇯🇵" :
                cat === "Manhwa" ? "🇰🇷" :
                cat === "Manhua" ? "🇨🇳" :
                cat === "Serie"  ? "🎞️" :
                cat === "Film"   ? "🎬" :
                cat === "Anime"  ? "🔥" :
                "❓"
              )
          );
        });
  
        const row = new ActionRowBuilder().addComponents(select);
  
        return interaction.reply({
          content: "Quelle catégorie souhaites-tu consulter ?",
          components: [row],
          ephemeral: true
        });
      }
  
      // 5) Sélection d'une catégorie pour la consultation => On affiche la liste
      if (interaction.isStringSelectMenu() && interaction.customId === "rank_consultSelect") {
        const chosenCat = interaction.values[0];
        const works = await getAllByCategory(interaction.guildId, chosenCat);
  
        if (works.length === 0) {
          return interaction.reply({
            content: `Aucune œuvre dans la catégorie **${chosenCat}**.`,
            ephemeral: true
          });
        }
  
        // Construire un petit message ou un embed
        let text = `Voici la liste des œuvres dans **${chosenCat}** :\n`;
        works.forEach((w, i) => {
          text += `**#${i+1}** ${w.title} — note moyenne : ${w.average_rating.toFixed(2)}/5 (basé sur ${w.rating_count} avis)\n`;
        });
  
        return interaction.reply({ content: text, ephemeral: true });
      }
    },
  };
  