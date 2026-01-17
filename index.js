require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, Events, MessageFlags } = require('discord.js');
const axios = require('axios');
const express = require('express');

// --- KONFIGURATION ---
const TWITCH_USER_LOGIN = 'RIPtzchen'; 
const WELCOME_CHANNEL_ID = '1103895697582993561'; // <--- WICHTIG: Hier ID eintragen!
let isLive = false;

// --- FAKE WEBSERVER ---
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('NekroBot lauert auf Beute... 💀'));
app.listen(port, () => console.log(`🌍 Webserver läuft auf Port ${port}`));

// --- DISCORD CLIENT ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, // <--- NEU: Erlaubt uns, neue User zu sehen!
    ]
});

// --- EVENTS ---
client.once(Events.ClientReady, c => {
    console.log(`✅ ${c.user.tag} ist online und hungrig.`);
    checkTwitch();
    setInterval(checkTwitch, 120000); 
    c.user.setActivity('Sammelt Seelen im Chat', { type: 0 });
});

// NEU: EVENT WENN JEMAND JOINT 🚪🏃
client.on(Events.GuildMemberAdd, async member => {
    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (!channel) return;

    // Wir suchen uns einen fiesen Spruch aus
    const insults = [
        'Hoffentlich hast du gute Hardware, sonst fliegst du gleich wieder raus.',
        'Noch eine verlorene Seele für die Sammlung.',
        'Knie nieder vor Riptzchen!',
        'Hat sich verlaufen und ist hier gelandet. Pech gehabt.',
        'Oh nein, nicht noch einer...'
    ];
    const randomInsult = insults[Math.floor(Math.random() * insults.length)];

    const welcomeEmbed = new EmbedBuilder()
        .setColor(0x8B0000) // Nekro-Rot
        .setTitle(`💀 Ein neues Opfer ist eingetroffen!`)
        .setDescription(`Willkommen in der Hölle, **${member.user.username}**.\n\n*${randomInsult}*`)
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

    channel.send({ content: `Hey ${member}, renn solange du noch kannst!`, embeds: [welcomeEmbed] });
});

// --- TWITCH CHECKER FUNKTION ---
async function checkTwitch() {
    try {
        const tokenResponse = await axios.post(`https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`);
        const accessToken = tokenResponse.data.access_token;

        const streamResponse = await axios.get(`https://api.twitch.tv/helix/streams?user_login=${TWITCH_USER_LOGIN}`, {
            headers: { 'Client-ID': process.env.TWITCH_CLIENT_ID, 'Authorization': `Bearer ${accessToken}` }
        });

        const data = streamResponse.data.data;

        if (data && data.length > 0) {
            if (!isLive) {
                isLive = true;
                const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
                if (channel) {
                    const streamInfo = data[0];
                    const liveEmbed = new EmbedBuilder()
                        .setColor(0x9146FF)
                        .setTitle(`🚨 ALARM: ${streamInfo.user_name} ist LIVE!`)
                        .setURL(`https://twitch.tv/${TWITCH_USER_LOGIN}`)
                        .setDescription(`**${streamInfo.title}**\n\nAb in den Stream!`)
                        .setImage(streamInfo.thumbnail_url.replace('{width}', '1280').replace('{height}', '720') + `?t=${Date.now()}`)
                        .setTimestamp();
                    channel.send({ content: `@everyone RIPtzchen sammelt jetzt Seelen! 🎥`, embeds: [liveEmbed] });
                    client.user.setActivity('RIPtzchen im Stream zu', { type: 3 }); 
                }
            }
        } else {
            if (isLive) {
                isLive = false;
                client.user.setActivity('Sammelt Seelen im Chat', { type: 0 });
            }
        }
    } catch (error) { console.error('Twitch Check Fehler:', error.message); }
}

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
                .setColor(0x8B0000)
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
    else if (commandName === 'ping') { await interaction.reply('Pong! 🏓 (Die Seelen sind sicher)'); }
    else if (commandName === 'website') { await interaction.reply({ content: 'HQ: https://riptzchen.github.io/riptzchen-website/', flags: MessageFlags.Ephemeral }); }
    else if (commandName === 'user') { await interaction.reply(`Ich sehe dich, ${interaction.user.username}... 👁️`); }
});

client.login(process.env.DISCORD_TOKEN);
