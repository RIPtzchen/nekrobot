require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

// Hier ist die aktualisierte Liste mit SETUP
const commands = [
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Antwortet mit Pong (Latenz-Check)'),
    new SlashCommandBuilder()
        .setName('user')
        .setDescription('Zeigt Infos über dich an'),
    new SlashCommandBuilder()
        .setName('website')
        .setDescription('Link zur Riptzchen-Base'),
    new SlashCommandBuilder()
        .setName('setup') // <--- DER NEUE
        .setDescription('Zeigt Riptzchens Hardware-Specs (RTX 5070 Flex)'),
]
    .map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('📦 Registriere neue Slash-Commands (ping, user, website, setup)...');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log('✅ Erfolgreich registriert! Discord kennt die Befehle jetzt.');
    } catch (error) {
        console.error(error);
    }
})();