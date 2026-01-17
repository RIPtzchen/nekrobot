require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, Events, PermissionFlagsBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, generateDependencyReport } = require('@discordjs/voice');
const play = require('play-dl');
const axios = require('axios');
const express = require('express');

// --- KONFIGURATION ---
const TWITCH_USER_LOGIN = 'RIPtzchen'; 
const WELCOME_CHANNEL_ID = '1103895697582993561'; 
const RULES_CHANNEL_ID   = '1103895697582993562';     
const ROLES_CHANNEL_ID   = '1103895697582993568';     
const AUTO_ROLE_ID       = '1462020482722172958'; 
const BAD_WORDS = ['hurensohn', 'hs', 'wichser', 'fortnite', 'schalke', 'bastard', 'lappen']; 

let isLive = false;
const player = createAudioPlayer(); 

const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('NekroBot Sodium Native. 🟠'));
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
    
    // Debug Report: Prüfen ob sodium-native jetzt da ist!
    console.log(generateDependencyReport());

    // SoundCloud Auth
    try {
        const client_id = await play.getFreeClientID();
        await play.setToken({ soundcloud: { client_id: client_id } });
        console.log(`✅ SoundCloud Auth OK (ID: ${client_id})`);
    } catch (err) { console.error('⚠️ SC Auth Fehler:', err.message); }

    const commands = [
        { name: 'setup', description: 'Zeigt dein PC-Setup' },
        { name: 'ping', description: 'Checkt, ob der Bot wach ist' },
        { name: 'website', description: 'Link zum HQ' },
        { name: 'user', description: 'Infos über dich' },
        { name: 'meme', description: 'Zufälliges Meme von r/ich_iel' },
        { name: 'clear', description: 'Löscht Nachrichten', defaultMemberPermissions: PermissionFlagsBits.ManageMessages, options: [{ name: 'anzahl', description: 'Menge (1-100)', type: 4, required: true }] },
        { name: 'play', description: 'Spielt Musik (SoundCloud)', options: [{ name: 'song', description: 'Suche oder Link', type: 3, required: true }] },
        { name: 'stop', description: 'Stoppt Musik' }
    ];

    await c.application.commands.set(commands);
    console.log('🤖 Commands bereit.');

    checkTwitch();
    setInterval(checkTwitch, 120000); 
    c.user.setActivity('Sammelt Seelen im Chat', { type: 0 });
});

// AUTO-MOD
client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return; 
    if (BAD_WORDS.some(word => message.content.toLowerCase().includes(word))) {
        try { await message.delete(); message.channel.send(`${message.author}, Maul! 🧼`).then(m => setTimeout(() => m.delete(), 5000)); } catch (e) {}
    }
});

// WELCOME
client.on(Events.GuildMemberAdd, async member => {
    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (channel) channel.send({ content: `**ALARM!** ${member} ist da!`, embeds: [new EmbedBuilder().setColor(0xFFFF00).setTitle(`⚠️ SYSTEM-ALARM ⚠️`).setDescription(`Subjekt ${member} gespawned.\nLies <#${RULES_CHANNEL_ID}> und hol dir Rollen in <#${ROLES_CHANNEL_ID}>!`).setThumbnail(member.user.displayAvatarURL())] });
    try { await member.roles.add(AUTO_ROLE_ID); } catch (e) {}
});

// COMMANDS
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'play') {
        await interaction.deferReply();
        const channel = interaction.member.voice.channel;
        if (!channel) return interaction.editReply('Geh in Voice!');

        const query = interaction.options.getString('song');
        try {
            const connection = joinVoiceChannel({ channelId: channel.id, guildId: channel.guild.id, adapterCreator: channel.guild.voiceAdapterCreator });
            
            let stream; let title; let url;

            if (query.startsWith('http')) {
                if (query.includes('soundcloud.com')) {
                     const soInfo = await play.soundcloud(query);
                     stream = await play.stream_from_info(soInfo);
                     title = soInfo.name; url = soInfo.url;
                } else {
                     try {
                        const ytInfo = await play.video_info(query);
                        stream = await play.stream_from_info(ytInfo);
                        title = ytInfo.video_details.title; url = ytInfo.video_details.url;
                     } catch (e) { return interaction.editReply('YouTube (429) blockt. Nimm SoundCloud.'); }
                }
            } else {
                const search = await play.search(query, { source: { soundcloud: 'tracks' }, limit: 1 });
                if (search.length === 0) return interaction.editReply('Nix auf SoundCloud gefunden.');
                const info = search[0];
                stream = await play.stream_from_info(info);
                title = info.name; url = info.url;
