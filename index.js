require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, Events, MessageFlags } = require('discord.js');
const axios = require('axios');
const express = require('express');

// --- KONFIGURATION ---
const TWITCH_USER_LOGIN = 'RIPtzchen'; // <--- Dein Twitch Name (genau wie in der URL)
let isLive = false; // Merkt sich, ob du schon live bist, damit er nicht spamt

// --- FAKE WEBSERVER ---
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('NekroBot TTV Edition ist online! 🟣'));
app.listen(port, () => console.log(`🌍 Webserver läuft auf Port ${port}`));

// --- DISCORD CLIENT ---
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// --- TWITCH CHECKER FUNKTION ---
async function checkTwitch() {
    try {
        // 1. Twitch Access Token holen (Der Schlüssel für die API)
        const tokenResponse = await axios.post(`https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`);
        const accessToken = tokenResponse.data.access_token;

        // 2. Stream Status abfragen
        const streamResponse = await axios.get(`https://api.twitch.tv/helix/streams?user_login=${TWITCH_USER_LOGIN}`, {
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const data = streamResponse.data.data;

        // 3. Logik: Sind wir live?
        if (data && data.length > 0) {
            // Stream ist ONLINE
            if (!isLive) {
                isLive = true;
                console.log(`🟣 ${TWITCH_USER_LOGIN} ist jetzt LIVE! Sende Nachricht...`);
                
                // Nachricht in den Discord ballern
                const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
                if (channel) {
                    const streamInfo = data[0];
                    const liveEmbed = new EmbedBuilder()
                        .setColor(0x9146FF) // Twitch Lila
                        .setTitle(`🚨 ALARM: ${streamInfo.user_name} ist LIVE!`)
                        .setURL(`https://twitch.tv/${TWITCH_USER_LOGIN}`)
                        .setDescription(`**${streamInfo.title}**\n\nKomm ran oder kassier Bann!`)
                        .setImage(streamInfo.thumbnail_url.replace('{width}', '1280').replace('{height}', '720') + `?t=${Date.now()}`) // Cache-Buster für Bild
                        .setTimestamp();

                    channel.send({ content: `@everyone Der Boss ist da! 🎥`, embeds: [liveEmbed] });
                    
                    // Bot Status ändern
                    client.user.setActivity('Riptzchen im Stream zu', { type: 3 }); 
                } else {
                    console.error('❌ Discord Channel nicht gefunden! ID prüfen.');
                }
            }
        } else {
            // Stream ist OFFLINE
            if (isLive) {
                isLive = false;
                console.log(`⚫ ${TWITCH_USER_LOGIN} ist offline gegangen.`);
                client.user.setActivity('Riptzchens RTX 5070 beim Rendern zu', { type: 3 });
            }
        }

    } catch (error) {
        console.error('Fehler beim Twitch-Check:', error.response ? error.response.data : error.message);
    }
}

// --- EVENTS ---
client.once(Events.ClientReady, c => {
    console.log(`✅ ${c.user.tag} ist online.`);
    
    // Check sofort beim Start und dann alle 2 Minuten (120000 ms)
    checkTwitch();
    setInterval(checkTwitch, 120000); 
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'setup') {
        await interaction.deferReply(); 
        try {
            const url = 'https://riptzchen.github.io/riptzchen-website/setup.json';
            const response = await axios.get(url);
            const data = response.data;
            const setupEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle(`🖥️ ${data.pc_name || 'Setup'}`)
                .setDescription(`*${data.status}*`)
                .addFields(
                    { name: 'GPU', value: data.specs.gpu, inline: true },
                    { name: 'CPU', value: data.specs.cpu, inline: true },
                    { name: 'RAM', value: data.specs.ram, inline: true }
                );
            await interaction.editReply({ embeds: [setupEmbed] });
        } catch (e) { await interaction.editReply('Fehler beim Laden.'); }
    }
    // ... ping, website etc. kannst du hier lassen, hab es gekürzt der Übersicht halber
});

client.login(process.env.DISCORD_TOKEN);
