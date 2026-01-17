require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, Events, MessageFlags } = require('discord.js');
const axios = require('axios');
const express = require('express');

// --- ⚙️ KONFIGURATION ---
const TWITCH_USER_LOGIN = 'RIPtzchen'; 
// HIER DEINE IDs DRIN LASSEN (die hast du ja schon):
const WELCOME_CHANNEL_ID = '1103895697582993561'; 
const RULES_CHANNEL_ID   = '1103895697582993562';     
const ROLES_CHANNEL_ID   = '1103895697582993568';     

// NEU: HIER DIE ROLLE REIN, DIE JEDER KRIEGEN SOLL:
const AUTO_ROLE_ID       = '1462020482722172958'; 

let isLive = false;

// --- FAKE WEBSERVER ---
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('NekroBot verteilt Rollen. 🏷️'));
app.listen(port, () => console.log(`🌍 Webserver läuft auf Port ${port}`));

// --- DISCORD CLIENT ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, 
    ]
});

// --- EVENTS ---
client.once(Events.ClientReady, c => {
    console.log(`✅ ${c.user.tag} ist online.`);
    checkTwitch();
    setInterval(checkTwitch, 120000); 
    c.user.setActivity('Sammelt Seelen im Chat', { type: 0 });
});

// 💀 WELCOME + AUTO ROLE
client.on(Events.GuildMemberAdd, async member => {
    // 1. Nachricht senden
    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (channel) {
        const welcomeEmbed = new EmbedBuilder()
            .setColor(0xFFFF00) 
            .setTitle(`⚠️ SYSTEM-ALARM: ENTITY DETECTED ⚠️`)
            .setDescription(
                `☣️ Subjekt ${member} ist im **Sektor RIPz** gespawned.\n` +
                `Status: **Lag-Opfer** (Verifizierung läuft...).\n\n` +
                `**💀 PROTOKOLL GESTARTET:**\n` +
                `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
                `1️⃣ **INHALIEREN:**\n` +
                `Lies die Gesetze, sonst droht der Exterminatus:\n` +
                `👉 <#${RULES_CHANNEL_ID}>\n\n` +
                `2️⃣ **IDENTIFIZIEREN:**\n` +
                `Wähle deine Mutation (Rollen) hier:\n` +
                `👉 <#${ROLES_CHANNEL_ID}>\n\n` +
                `3️⃣ **ESKALIEREN:**\n` +
                `Meld dich im Chat oder geh in den Voice.\n` +
                `(Sei kein NPC!)\n\n` +
                `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
                `*Glory to the Cyber-Shinigami.* ⛩️`
            )
            .setThumbnail(member.user.displayAvatarURL()) 
            .setTimestamp();
        
        channel.send({ content: `**ALARM!** ${member} hat die Barriere durchbrochen!`, embeds: [welcomeEmbed] });
    }

    // 2. Rolle geben (NEU!)
    try {
        const role = member.guild.roles.cache.get(AUTO_ROLE_ID);
        if (role) {
            await member.roles.add(role);
            console.log(`🏷️ Rolle ${role.name} an ${member.user.tag} vergeben.`);
        } else {
            console.error('❌ Rolle nicht gefunden! Check die ID.');
        }
    } catch (error) {
        console.error('❌ Konnte Rolle nicht vergeben (Bot muss in der Rangliste höher stehen!):', error.message);
    }
});

// --- TWITCH CHECKER ---
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

// --- COMMANDS ---
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
    else if (commandName === 'ping') { await interaction.reply('Pong! 🏓 (System stabil)'); }
    else if (commandName === 'website') { await interaction.reply({ content: 'HQ: https://riptzchen.github.io/riptzchen-website/', flags: MessageFlags.Ephemeral }); }
    else if (commandName === 'user') { await interaction.reply(`Identifiziere Subjekt: ${interaction.user.username}... 👁️`); }
});

client.login(process.env.DISCORD_TOKEN);
