require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, Events, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const play = require('play-dl');
const axios = require('axios');
const express = require('express');

// --- ⚙️ KONFIGURATION ---
const TWITCH_USER_LOGIN = 'RIPtzchen'; 
const WELCOME_CHANNEL_ID = '1103895697582993561'; 
const RULES_CHANNEL_ID   = '1103895697582993562';     
const ROLES_CHANNEL_ID   = '1103895697582993568';     
const AUTO_ROLE_ID       = '1462020482722172958'; 
const BAD_WORDS = ['hurensohn', 'hs', 'wichser', 'fortnite', 'schalke', 'bastard', 'lappen']; 

let isLive = false;
let player = createAudioPlayer(); 
let connection = null; 

const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('NekroBot Core Active. 🎧'));
app.listen(port, () => console.log(`🌍 Webserver läuft auf Port ${port}`));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates 
    ]
});

client.once(Events.ClientReady, async c => {
    console.log(`✅ ${c.user.tag} ist online.`);
    
    const commands = [
        { name: 'setup', description: 'Zeigt dein PC-Setup' },
        { name: 'ping', description: 'Checkt, ob der Bot wach ist' },
        { name: 'website', description: 'Link zum HQ' },
        { name: 'user', description: 'Infos über dich' },
        { name: 'meme', description: 'Zufälliges Meme von r/ich_iel' },
        { 
            name: 'clear', 
            description: 'Löscht Nachrichten (Nur für Mods)', 
            defaultMemberPermissions: PermissionFlagsBits.ManageMessages,
            options: [{ name: 'anzahl', description: 'Menge (1-100)', type: 4, required: true }]
        },
        {
            name: 'play',
            description: 'Spielt Musik von YouTube',
            options: [{ name: 'song', description: 'YouTube Link oder Suche', type: 3, required: true }]
        },
        { name: 'stop', description: 'Stoppt die Musik' }
    ];

    await c.application.commands.set(commands);
    console.log('🤖 Commands geladen.');

    checkTwitch();
    setInterval(checkTwitch, 120000); 
    c.user.setActivity('Sammelt Seelen im Chat', { type: 0 });
});

// 🛡️ AUTO-MOD
client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return; 
    const content = message.content.toLowerCase();
    const foundBadWord = BAD_WORDS.find(word => content.includes(word));
    if (foundBadWord) {
        try {
            await message.delete(); 
            const warning = await message.channel.send(`${message.author}, wasch dir den Mund mit Seife! 🧼`);
            setTimeout(() => warning.delete().catch(e => {}), 5000);
        } catch (err) { console.error('Auto-Mod Fehler:', err); }
    }
});

// 💀 WELCOME
client.on(Events.GuildMemberAdd, async member => {
    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (channel) {
        const welcomeEmbed = new EmbedBuilder().setColor(0xFFFF00).setTitle(`⚠️ SYSTEM-ALARM: ENTITY DETECTED ⚠️`)
            .setDescription(`☣️ Subjekt ${member} ist im **Sektor RIPz** gespawned.\nStatus: **Lag-Opfer** (Verifizierung läuft...)\n\n**💀 PROTOKOLL GESTARTET:**\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n1️⃣ **INHALIEREN:** <#${RULES_CHANNEL_ID}>\n2️⃣ **IDENTIFIZIEREN:** <#${ROLES_CHANNEL_ID}>\n3️⃣ **ESKALIEREN:** Sei kein NPC!\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n*Glory to the Cyber-Shinigami.* ⛩️`)
            .setThumbnail(member.user.displayAvatarURL()).setTimestamp();
        channel.send({ content: `**ALARM!** ${member} hat die Barriere durchbrochen!`, embeds: [welcomeEmbed] });
    }
    try { const role = member.guild.roles.cache.get(AUTO_ROLE_ID); if (role) await member.roles.add(role); } catch (e) {}
});

// --- COMMANDS ---
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'play') {
        await interaction.deferReply();
        const channel = interaction.member.voice.channel;
        if (!channel) return interaction.editReply('Geh erst in einen Voice-Channel! 🔉');

        const query = interaction.options.getString('song');
        try {
            connection = joinVoiceChannel({
                channelId: channel.id, guildId: channel.guild.id, adapterCreator: channel.guild.voiceAdapterCreator,
            });

            // Stream Logik
            let stream;
            let yt_info;
            if (query.startsWith('http')) {
                yt_info = await play.video_info(query);
                stream = await play.stream_from_info(yt_info);
            } else {
                const search = await play.search(query, { limit: 1 });
                if (search.length === 0) return interaction.editReply('Nix gefunden. 🤷‍♂️');
                yt_info = await play.video_info(search[0].url);
                stream = await play.stream_from_info(yt_info);
            }

            const resource = createAudioResource(stream.stream, { inputType: stream.type });
            player.play(resource);
            connection.subscribe(player);

            await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x9146FF).setTitle(`🎶 Spiele: ${yt_info.video_details.title}`).setURL(yt_info.video_details.url).setThumbnail(yt_info.video_details.thumbnails[0].url)] });
        } catch (error) {
            console.error(error);
            await interaction.editReply('Fehler beim Abspielen. 💀');
        }
    }
    else if (commandName === 'stop') {
        if (connection) { player.stop(); connection.destroy(); connection = null; await interaction.reply('Musik aus. Tschüss! 👋'); } 
        else { await interaction.reply('Ich spiele doch gar nichts.'); }
    }
    else if (commandName === 'clear') {
        const amount = interaction.options.getInteger('anzahl');
        if (amount < 1 || amount > 100) return interaction.reply({ content: 'Nur 1-100 erlaubt!', flags: MessageFlags.Ephemeral });
        await interaction.channel.bulkDelete(amount, true).catch(e => {});
        interaction.reply({ content: `🧹 ${amount} Nachrichten gelöscht.`, flags: MessageFlags.Ephemeral });
    }
    else if (commandName === 'meme') {
        await interaction.deferReply();
        try {
            const res = await axios.get('https://meme-api.com/gimme/ich_iel'); 
            const meme = res.data;
            if(meme.nsfw) return interaction.editReply('Pfui! NSFW. 🔞');
            await interaction.editReply({ embeds: [new EmbedBuilder().setTitle(meme.title).setImage(meme.url).setColor(0x99AAB5)] });
        } catch (e) { await interaction.editReply('Keine Memes.'); }
    }
    else if (commandName === 'setup') {
        await interaction.deferReply(); 
        try {
            const url = 'https://riptzchen.github.io/riptzchen-website/setup.json';
            const response = await axios.get(url);
            const data = response.data;
            const setupEmbed = new EmbedBuilder().setColor(0x8B0000).setTitle(`🖥️ ${data.pc_name || 'Setup'}`).setDescription(`*${data.status}*\nBesitzer: **${data.owner}**`).setThumbnail('https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png')
                .addFields({ name: 'GPU', value: data.specs.gpu, inline: true }, { name: 'CPU', value: data.specs.cpu, inline: true }, { name: 'RAM', value: data.specs.ram, inline: true }, { name: 'Peripherie', value: `${data.peripherals.keyboard}\n${data.peripherals.mouse}`, inline: false });
            await interaction.editReply({ embeds: [setupEmbed] });
        } catch (e) { await interaction.editReply('Fehler beim Laden.'); }
    }
    else if (commandName === 'ping') { await interaction.reply('Pong! 🏓'); }
    else if (commandName === 'website') { await interaction.reply({ content: 'HQ: https://riptzchen.github.io/riptzchen-website/', flags: MessageFlags.Ephemeral }); }
    else if (commandName === 'user') { await interaction.reply(`Subjekt: ${interaction.user.username}`); }
});

async function checkTwitch() {
    try {
        const tokenResponse = await axios.post(`https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`);
        const accessToken = tokenResponse.data.access_token;
        const streamResponse = await axios.get(`https://api.twitch.tv/helix/streams?user_login=${TWITCH_USER_LOGIN}`, { headers: { 'Client-ID': process.env.TWITCH_CLIENT_ID, 'Authorization': `Bearer ${accessToken}` } });
        const data = streamResponse.data.data;
        if (data && data.length > 0) {
            if (!isLive) {
                isLive = true;
                const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID); 
                if (channel) {
                    const streamInfo = data[0];
                    const liveEmbed = new EmbedBuilder().setColor(0x9146FF).setTitle(`🚨 ALARM: ${streamInfo.user_name} ist LIVE!`).setURL(`https://twitch.tv/${TWITCH_USER_LOGIN}`).setDescription(`**${streamInfo.title}**`).setImage(streamInfo.thumbnail_url.replace('{width}', '1280').replace('{height}', '720') + `?t=${Date.now()}`);
                    channel.send({ content: `@everyone RIPtzchen ist on air!`, embeds: [liveEmbed] });
                    client.user.setActivity('RIPtzchen im Stream zu', { type: 3 }); 
                }
            }
        } else { if (isLive) { isLive = false; client.user.setActivity('Sammelt Seelen im Chat', { type: 0 }); } }
    } catch (error) { console.error('Twitch Check Fehler:', error.message); }
}

client.login(process.env.DISCORD_TOKEN);
