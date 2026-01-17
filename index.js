require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, Events, PermissionFlagsBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, generateDependencyReport } = require('@discordjs/voice');
const play = require('play-dl');
const axios = require('axios');
const express = require('express');
const sodium = require('libsodium-wrappers');

// --- ⚙️ KONFIGURATION & LISTEN ---
const TWITCH_USER_LOGIN = 'RIPtzchen'; 
const WELCOME_CHANNEL_ID = '1103895697582993561'; 
const RULES_CHANNEL_ID   = '1103895697582993562';     
const ROLES_CHANNEL_ID   = '1103895697582993568';     
const AUTO_ROLE_ID       = '1462020482722172958'; 

// ✅ NEUE GYM-CHANNEL ID:
const GYM_CHANNEL_ID     = '1462193628347895899'; 

const BAD_WORDS = ['hurensohn', 'hs', 'wichser', 'fortnite', 'schalke', 'bastard', 'lappen']; 

// 🎱 ORAKEL ANTWORTEN (Böse)
const ORACLE_ANSWERS = [
    "Träum weiter.", "Sicher... nicht.", "Frag wen, den es interessiert.", 
    "404: Motivation not found.", "Ja, aber du wirst es bereuen.", 
    "Deine Chancen stehen schlechter als mein Code.", "Lösch dich.", 
    "Absolut.", "Vielleicht, wenn du bettelst.", "Nein. Einfach nein."
];

// 🔥 ROAST SPRÜCHE
const ROASTS = [
    "dein Stammbaum ist ein Kreis.", 
    "ich würde dich beleidigen, aber die Natur war schneller.",
    "du bist der Grund, warum Aliens nicht mit uns reden.",
    "wenn Dummheit leuchten würde, wärst du die Sonne.",
    "deine K/D ist niedriger als dein IQ.",
    "du bist wie eine Wolke: Wenn du dich verziehst, wird der Tag schön.",
    "wurdest du auf der Autobahn geboren? Das ist nämlich ein Unfall.",
    "spar dir die Luft, du verschwendest Sauerstoff."
];

// 💪 AGGRO TRAINER SPRÜCHE
const GYM_TIPS = [
    "Sitz gerade, du Garnele! 🦐", 
    "Trink Wasser, sonst staubst du ein! 💧", 
    "Beweg dich! Der Stuhl wächst schon an deinem Hintern fest! 🪑",
    "Haltung korrigieren! Du siehst aus wie ein Fragezeichen! ❓",
    "Mach mal 10 Liegestütze, du Lappen! 💪",
    "Bildschirm-Pause! Deine Augen werden schon viereckig! ⬛"
];

let isLive = false;
const player = createAudioPlayer(); 

const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('NekroBot Gym Updated. ☣️'));
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
    console.log(`⏳ Warte auf Software-Verschlüsselung...`);
    await sodium.ready; 
    console.log(`🔐 Verschlüsselung bereit!`);
    
    // Debug Report
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
        { name: 'stop', description: 'Stoppt Musik' },
        // NEUE BEFEHLE:
        { name: 'orakel', description: 'Stell dem Bot eine Frage', options: [{ name: 'frage', description: 'Deine Frage', type: 3, required: true }] },
        { name: 'roast', description: 'Beleidige einen User', options: [{ name: 'opfer', description: 'Wen soll es treffen?', type: 6, required: true }] }
    ];

    await c.application.commands.set(commands);
    console.log('🤖 Commands bereit.');

    checkTwitch();
    setInterval(checkTwitch, 120000); // Alle 2 Min Twitch Check

    // 💪 AGGRO TRAINER TIMER (Alle 60 Minuten = 3600000 ms)
    setInterval(() => {
        const channel = client.channels.cache.get(GYM_CHANNEL_ID);
        if (channel) {
            const randomTip = GYM_TIPS[Math.floor(Math.random() * GYM_TIPS.length)];
            channel.send(`**🏋️ ZEIT FÜR PAIN:** ${randomTip}`);
        } else {
            console.log("⚠️ Gym-Channel ID falsch oder Bot hat keinen Zugriff!");
        }
    }, 3600000); 

    c.user.setActivity('urteilt über euch', { type: 3 }); 
});

// AUTO-MOD
client.on(Events.MessageCreate, async message => {
    if (message
