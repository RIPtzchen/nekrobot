require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, Events, MessageFlags } = require('discord.js');
const axios = require('axios');
const express = require('express');

// --- KONFIGURATION ---
const TWITCH_USER_LOGIN = 'RIPtzchen'; // Dein Twitch Name
let isLive = false;

// --- FAKE WEBSERVER ---
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('NekroBot ist bereit für Seelen! 💀'));
app.listen(port, () => console.log(`🌍 Webserver läuft auf Port ${port}`));

// --- DISCORD CLIENT ---
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// --- TWITCH CHECKER FUNKTION ---
async function checkTwitch() {
    try {
        const tokenResponse = await axios.post(`https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`);
        const accessToken = tokenResponse.data.access_token;

        const streamResponse = await axios.get(`https://api.twitch.tv/helix/streams?user_login=${TWITCH_USER_LOGIN}`, {
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const data = streamResponse.data.data;

        if (data && data.length > 0) {
            if (!isLive) {
                isLive = true;
                console.log(`🟣 ${TWITCH_USER_LOGIN} ist LIVE!`);
                const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
                if (channel) {
                    const streamInfo = data[0];
                    const liveEmbed = new EmbedBuilder()
                        .setColor(0x9146FF) // Twitch Lila (bleibt so)
                        .setTitle(`🚨 ALARM: ${streamInfo.user_name} ist LIVE!`)
                        .setURL(`https://twitch.tv/${TWITCH_USER_LOGIN}`)
                        .setDescription(`**${streamInfo.title}**\n\nAb in den Stream!`)
                        .setImage(streamInfo.thumbnail_url.replace('{width}', '1280').replace('{height}', '720') + `?t=${Date.now()}`)
                        .setTimestamp();
                    channel.send({ content: `@everyone RIPtzchen sammelt jetzt Seelen! 🎥`, embeds: [liveEmbed] });
                    
                    // Status während Stream
                    client.user.setActivity('RIPtzchen im Stream zu', { type: 3 }); 
                }
            }
        } else {
            if (isLive) {
                isLive = false;
                console.log(`⚫ ${TWITCH_USER_LOGIN} ist offline.`);
                // Status wenn Offline: DEIN NEUER TEXT
                client.user.setActivity('Sammelt Seelen im Chat', { type: 0 }); // type 0 = "Spielt ..."
            }
        }
    } catch (error) {
        console.error('Fehler beim Twitch-Check:', error.message);
    }
}

// --- EVENTS ---
client.once(Events.ClientReady, c => {
    console.log(`✅ ${c.user.tag} ist online.`);
    checkTwitch();
    setInterval(checkTwitch, 120000); // Alle 2 Min
    
    // Status beim Start setzen
    c.user.setActivity('Sammelt Seelen im Chat', { type: 0 });
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    // --- COMMAND: SETUP ---
    if (commandName === 'setup') {
        await interaction.deferReply(); 
        try {
            const url = 'https://riptzchen.github.io/riptzchen-website/setup.json';
            const response = await axios.get(url);
            const data = response.data;
            const setupEmbed = new EmbedBuilder()
                .setColor(0x8B0000) // <--- DUNKLES NEKROMANTEN-ROT 🩸
                .setTitle(`🖥️ ${data.pc_name || 'Setup'}`)
                .setDescription(`*${data.status}*\nBesitzer: **${data.owner}**`)
                .setThumbnail('https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png')
                .addFields(
                    { name: 'GPU', value: data.specs.gpu, inline: true },
                    { name: 'CPU', value: data.specs.cpu, inline: true },
                    { name: 'RAM', value: data.specs.ram, inline: true },
                    { name: 'Peripherie', value: `${data.peripherals.keyboard}\n${data.peripherals.mouse}`, inline: false }
                );
            await interaction.editReply({ embeds: [setupEmbed] });
        } catch (e) { await interaction.editReply('Fehler beim Laden.'); }
    }

    // --- COMMAND: PING ---
    else if (commandName === 'ping') {
        await interaction.reply('Pong! 🏓 (Die Seelen sind sicher)');
    }

    // --- COMMAND: WEBSITE ---
    else if (commandName === 'website') {
        await interaction.reply({ 
            content: 'Hier ist das HQ: https://riptzchen.github.io/riptzchen-website/', 
            flags: MessageFlags.Ephemeral 
        });
    }

    // --- COMMAND: USER ---
    else if (commandName === 'user') {
        await interaction.reply(`Ich sehe dich, ${interaction.user.username}... 👁️`);
    }
});

client.login(process.env.DISCORD_TOKEN);
