// src/index.js

require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { initDB } = require('./database/db');
const messageCreate = require('./events/messageCreate');
const readyEvent = require('./events/ready');   // <- On importe ton ready.js
const interactionCreate = require('./events/interactionCreate');
const rankingInteractions = require('./events/rankingInteractions'); // ex: rank_addRate, etc.

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// On remplace l'ancien "ready" inline par :
client.once('ready', () => {
  // On appelle la fonction "execute" de ton module ready.js
  readyEvent.execute(client);
});

// messageCreate
client.on('messageCreate', (message) => {
  messageCreate.execute(message);
});

client.on('interactionCreate', (interaction) => {
    interactionCreate.execute(interaction);
});

client.on('interactionCreate', (interaction) => {
    rankingInteractions.execute(interaction);
});

async function main() {
  await initDB();
  await client.login(process.env.DISCORD_TOKEN);
}

main();
