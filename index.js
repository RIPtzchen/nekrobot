require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, Events, MessageFlags } = require('discord.js');
const axios = require('axios');
const express = require('express');

// --- ⚙️ KONFIGURATION (HARDCODED) ---
const TWITCH_USER_LOGIN = 'RIPtzchen'; 

// DEINE IDs SIND JETZT FEST VERDRAHTET:
const WELCOME_CHANNEL_ID = '1103895697582993561'; 
const RULES_CHANNEL_ID   = '1103895697582993562';     
const ROLES_CHANNEL_ID   = '1103895697582993568';     
const AUTO_ROLE_ID       = '1462020482722172958'; // Lag-Opfer Rolle

// 🤬 DIE VERBOTENE LISTE (Auto-Mod)
// Alles klein schreiben!
const BAD_WORDS = ['hurensohn', 'hs', 'wichser', 'fortnite', 'schalke', 'bastard', 'lappen']; 

let isLive = false;

// --- FAKE WEBSERVER ---
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('NekroBot: System aktiv. 💀'));
app.listen(port, () => console.log(`🌍 Webserver läuft auf Port ${port}`));

// --- DISCORD CLIENT ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessages, // Wichtig für Auto-Mod
        GatewayIntentBits.MessageContent // Wichtig um Text zu lesen
    ]
});

// --- EVENTS ---
client.once(Events.ClientReady, async c => {
    console.log(`✅ ${c.user.tag} ist online.`);
    
    // AUTOMATISCHE BEFEHLS-REGISTRIERUNG
    // Damit /meme sofort verfügbar ist
    const commands = [
        { name: 'setup', description: 'Zeigt dein PC-Setup' },
        { name: 'ping', description: 'Checkt, ob der Bot wach ist' },
        { name: 'website', description: 'Link zum HQ' },
        { name: 'user', description: 'Infos über dich' },
        { name: 'meme', description: 'Zufälliges Meme von r/ich_iel' }
    ];
    await c.application.commands.set(commands);
    console.log('🤖 Slash-Commands wurden aktualisiert!');

    checkTwitch();
    setInterval(checkTwitch, 120000); 
    c.user.setActivity('Sammelt Seelen im Chat', { type: 0 });
});

// 🛡️ AUTO-MODERATION (Der Türsteher)
client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return; // Bots ignorieren

    const content = message.content.toLowerCase();
    const foundBadWord = BAD_WORDS.find(word => content.includes(word));

    if (foundBadWord) {
        try {
            await message.delete(); 
            const warning = await message.channel.send(`${message.author}, wasch dir den Mund mit Seife! 🧼 (Wort: ||${foundBadWord}||)`);
            setTimeout(() => warning.delete().catch(e => {}), 5000);
            console.log(`🛡️ Auto-Mod: Nachricht von ${message.author.tag} gelöscht.`);
        } catch (err) {
            console.error('Konnte Nachricht nicht löschen (Fehlen Rechte
