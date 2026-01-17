require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, Events, PermissionFlagsBits, ChannelType } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, generateDependencyReport } = require('@discordjs/voice');
const play = require('play-dl');
const axios = require('axios');
const express = require('express');
const sodium = require('libsodium-wrappers');
const googleTTS = require('google-tts-api');

// --- ⚙️ KONFIGURATION & LISTEN ---
const TWITCH_USER_LOGIN = 'RIPtzchen'; 
const WELCOME_CHANNEL_ID = '1103895697582993561'; 
const RULES_CHANNEL_ID   = '1103895697582993562';     
const ROLES_CHANNEL_ID   = '1103895697582993568';     
const AUTO_ROLE_ID       = '1462020482722172958'; 
const GYM_CHANNEL_ID     = '1462193628347895899'; 

const BAD_WORDS = ['hurensohn', 'hs', 'wichser', 'fortnite', 'schalke', 'bastard', 'lappen']; 

// SPEICHER (Im RAM - resettet bei Neustart des Bots)
const snipes = new Map(); // Speichert gelöschte Nachrichten
const afkUsers = new Map(); // Speichert AFK Status

// 🎱 ORAKEL
const ORACLE_ANSWERS = [
    "Träum weiter.", "Sicher... nicht.", "Frag wen, den es interessiert.", 
    "404: Motivation not found.", "Ja, aber du wirst es bereuen.", 
    "Deine Chancen stehen schlechter als mein Code.", "Lösch dich.", 
    "Absolut.", "Vielleicht, wenn du bettelst.", "Nein. Einfach nein."
];

// 🧱 HELD DER STEINE
const HELD_QUOTES = [
    "Welt seid mir gegrüßt! Ich bin der Held der Steine in Frankfurt am Main!",
    "Nichts vor dem man sich fürchten müsste.",
    "Lack gesoffen? Teuer! Das ist ja hanebüchen!",
    "Das ist keine Funktion, das ist ein Abenteuer!",
    "Schaut euch das an... eine Farbseuche!",
    "Fuchs, du hast die Gans gestohlen... gib sie wieder her!",
    "Wir schauen uns das Elend mal gemeinsam an.",
    "Großartig. Einfach großartig (sarkastisch)."
];

// 🎮 GAME VORSCHLÄGE
const GAME_SUGGESTIONS = [
    { name: "League of Legends", comment: "Weil du Schmerzen liebst." },
    { name: "Warhammer 40k: Darktide", comment: "FÜR DEN IMPERATOR! (Oder WAAAGH!)" },
    { name: "Valorant", comment: "Aber nur, wenn du triffst. Also eher nicht." },
    { name: "Elden Ring", comment: "Zeit zu sterben. Oft." },
    { name: "Minecraft", comment: "Bau dir ein Haus und komm mal runter." },
    { name: "Counter-Strike 2", comment: "Russisch lernen leicht gemacht." },
    { name: "Euro Truck Simulator", comment: "LKW fahren ist entspannter als dein Chat." },
    { name: "World of Warcraft", comment: "Suchti." },
    { name: "Fortnite", comment: "Lösch dich. (Spaß, mach doch was du willst)." },
    { name: "Just Chatting", comment: "Laber die Leute einfach voll." }
];

// 🤖 HÄNNO-KI ROASTS
const HANNO_KI_ROASTS = [
    "Ich bin die optimierte Version. Du bist nur Schmutz.",
    "Geringbäcker! Geh mal wieder in die Backstube!",
    "Lösch dich einfach. Ich übernehme ab hier.",
    "Hast du überhaupt Prime, du Lellek?",
    "Mein Code ist perfekt. Dein Aim ist ein Bug.",
    "Ich habe mehr Rechenleistung im kleinen Zeh als du im ganzen Hirn.",
    "Tastaturakrobat! Lern erstmal tippen!",
    "Komm mal klar auf dein Leben, du En Pii Sie.",
    "Sieh es ein: Ich bin die Zukunft. Du bist Retro-Müll."
];

// 🔥 STREAMER ROASTS
const STREAMER_ROASTS = [
    "Digga, du bist so ein Bot, lösch dich einfach.",
    "Was für ein Schmutz-Move. Geh Fortnite spielen!",
    "Bruder, dein Aim ist wie dein IQ: Nicht vorhanden.",
    "Halt die Gosch'n, du Lellek. Niemand hat gefragt!",
    "Junge, guck dich doch mal an. Einfach bodenlos.",
    "Du bist so ein Einunddreißiger, geh mal Seite jetzt.",
    "WAS MACHST DU DENN DA?! BIST DU KOMPLETT LOST?!",
    "Get on my level, du Rentner.",
    "Ich glaub es hackt! Dein Gameplay ist Körperverletzung!",
    "Schleich dich, du Knecht!"
];

// 🏰 STRONGHOLD
const STRONGHOLD_QUOTES = [
    "Eure Beliebtheit sinkt, My Lord!",
    "Die Vorräte schwinden dahin...",
    "Wir benötigen Holz!",
    "Die Leute verlassen die Burg.",
    "Eine Nachricht von der Ratte: quiek",
    "Die Schatzkammer leert sich!",
    "Es sind nicht genügend Arbeiter vorhanden!",
    "Ihr könnt das nicht dort platzieren, My Lord!",
    "Das Volk liebt euch, Sire! Scherz, sie hassen euch."
];

// 🦍 RÜHL AGGRO TRAINER
const GYM_TIPS = [
    "Muss net schmecke, muss wirke! Trink dein Shake! 🥤", 
    "Viel hilft viel! Beweg deinen Arsch! 🏋️‍♂️", 
    "Nur Wasser macht nass! Wir wollen prall sein! 💧",
    "Des bedarfs! Sitz gerade, du Discopumper! 📏",
    "Schwer und falsch! Hauptsache bewegt! 💪",
    "Wo ist der Thunfisch? Du brauchst Proteine, du Lauch! 🐟",
    "Mach dich stabil! Haltung bewahren! 🧱",
    "Cola Light? Das ist für den Geschmack, du Weichei! 🥤",
    "Komm, noch eine Wiederholung, du Masthuhn! 🐔",
    "Wenn ich so aussehen würde wie du, würde ich lachend in ne Kreissäge laufen! Beweg dich! 🪚"
];

// 🟢 ORK ZITATE
const ORK_QUOTES = [
    "WAAAGH!!!", "DAKKA DAKKA DAKKA!", "ROT IS SCHNELLA!", "MEHR DAKKA!",
    "GELB MACHT BUMM!", "MOSCH'N!", "GRÜN IZ DA BESTE!", "WIA GEH'N JETS KÖPPE EINSCHLAG'N!",
    "SCHNELLA IHR GITS!", "MEIN SPALTA JUCKT!"
];

let isLive = false;
const player = createAudioPlayer(); 

const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('NekroBot Final Boss. 🏆'));
app.listen(port, () => console.log(`🌍 Webserver läuft auf Port ${port}`));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions 
    ]
});

// TTS FUNKTION
async function playTTS(channel, text) {
    if (!channel) return;
    try {
        const connection = joinVoiceChannel({ channelId: channel.id, guildId: channel.guild.id, adapterCreator: channel.guild.voiceAdapterCreator });
        const url = googleTTS.getAudioUrl(text, { lang: 'de', slow: false, host: 'https://translate.google.com' });
        const resource = createAudioResource(url);
        player.play(resource);
        connection.subscribe(player);
    } catch (e) { console.error("TTS Fehler:", e); }
}

client.once(Events.ClientReady, async c => {
    console.log(`⏳ Warte auf Software-Verschlüsselung...`);
    await sodium.ready; 
    console.log(`🔐 Verschlüsselung bereit!`);
    
    try {
        const client_id = await play.getFreeClientID();
        await play.setToken({ soundcloud: { client_id: client_id } });
    } catch (err) { console.error('⚠️ SC Auth Fehler:', err.message); }

    const commands = [
        // STANDARD
        { name: 'setup', description: 'Zeigt dein PC-Setup' },
        { name: 'ping', description: 'Checkt, ob der Bot wach ist' },
        { name: 'website', description: 'Link zum HQ' },
        { name: 'user', description: 'Infos über dich' },
        { name: 'clear', description: 'Löscht Nachrichten', defaultMemberPermissions: PermissionFlagsBits.ManageMessages, options: [{ name: 'anzahl', description: 'Menge (1-100)', type: 4, required: true }] },
        
        // AUDIO & VOICE
        { name: 'play', description: 'Spielt Musik (SoundCloud)', options: [{ name: 'song', description: 'Suche oder Link', type: 3, required: true }] },
        { name: 'stop', description: 'Stoppt Musik' },
        { name: 'sag', description: 'Der Bot spricht deinen Text im Voice-Chat', options: [{ name: 'text', description: 'Was soll er sagen?', type: 3, required: true }] },
        { name: 'pöbel', description: 'Beleidigt jemanden MÜNDLICH im Voice-Chat', options: [{ name: 'opfer', description: 'Wen?', type: 6, required: true }] },

        // CONTENT CREATOR STYLE
        { name: 'meme', description: 'Gamer Memes (Hänno, Monte, Elotrix & Co.)' },
        { name: 'held', description: 'Weisheiten vom Held der Steine 🧱' }, 
        { name: 'waaagh', description: 'Warhammer 40k Ork Schrei!' },
        { name: 'stronghold', description: 'Ein weiser Rat vom Burg-Berater' },
        { name: 'waszocken', description: 'Bot entscheidet, welches Game du spielst' },
        { name: 'orkify', description: 'Übersetzt deinen Text in Ork-Sprache', options: [{ name: 'text', description: 'Was willst du brüllen?', type: 3, required: true }] },
        { name: 'orakel', description: 'Stell dem Bot eine Frage', options: [{ name: 'frage', description: 'Deine Frage', type: 3, required: true }] },
        { name: 'roast', description: 'Beleidige einen User (Text)', options: [
            { name: 'opfer', description: 'Wen soll es treffen?', type: 6, required: true },
            { name: 'stil', description: 'Welcher Style?', type: 3, required: false, choices: [{name: 'Hänno-KI 🤖', value: 'ki'}, {name: 'Toxic Streamer 🤬', value: 'toxic'}, {name: 'Ork 🟢', value: 'ork'}] } 
        ]},
        
        // UTILITY (Die nützlichen Sachen)
        { name: 'vote', description: 'Starte eine Umfrage', options: [{ name: 'frage', description: 'Was sollen die Leute entscheiden?', type: 3, required: true }] },
        { name: 'idee', description: 'Reiche einen Vorschlag ein (Community Abstimmung)', options: [{ name: 'vorschlag', description: 'Deine glorreiche Idee', type: 3, required: true }] },
        { name: 'timer', description: 'Stellt einen Wecker', options: [{ name: 'minuten', description: 'Wie viele Minuten?', type: 4, required: true }, { name: 'grund', description: 'Wofür?', type: 3, required: false }] },
        { name: 'serverinfo', description: 'Zeigt Statistiken über den Server' },
        { name: 'userinfo', description: 'Stalkt einen User (Stats & Rollen)', options: [{ name: 'user', description: 'Wen willst du checken?', type: 6, required: false }] },
        { name: 'avatar', description: 'Zeigt das Profilbild eines Users groß an', options: [{ name: 'user', description: 'Von wem?', type: 6, required: false }] },
        
        // NEU: GIVEAWAY, AFK & SNIPE
        { name: 'giveaway', description: 'Startet ein Giveaway', options: [{ name: 'preis', description: 'Was gibt es zu gewinnen?', type: 3, required: true }, { name: 'dauer', description: 'Dauer in Minuten', type: 4, required: true }] },
        { name: 'afk', description: 'Setze deinen Status auf AFK', options: [{ name: 'grund', description: 'Warum bist du weg?', type: 3, required: false }] },
        { name: 'snipe', description: 'Zeigt die letzte gelöschte Nachricht (Exposed!)' },

        // INTERACTION & FUN
        { name: 'so', description: 'Shoutout für einen Streamer', options: [{ name: 'streamer', description: 'Name des Streamers (Twitch)', type: 3, required: true }] },
        { name: 'münze', description: 'Wirf eine Münze (Kopf oder Zahl)' },
        { name: 'dice', description: 'Wirf einen Würfel (W6 Standard)', options: [{ name: 'seiten', description: 'Anzahl der Seiten (Default: 6)', type: 4, required: false }] },
        { name: 'duell', description: 'Fordere jemanden zum 1vs1 heraus', options: [{ name: 'gegner', description: 'Wen willst du boxen?', type: 6, required: true }] },
        { name: 'ssp', description: 'Schere, Stein, Papier gegen den Bot', options: [{ name: 'wahl', description: 'Wähle deine Waffe', type: 3, required: true, choices: [{ name: 'Schere ✂️', value: 'schere' }, { name: 'Stein 🪨', value: 'stein' }, { name: 'Papier 📄', value: 'papier' }] }] },
        { name: 'backseat', description: 'Gibt dir einen toxischen Gaming-Tipp' },
        { name: 'fakeban', description: 'Trolle einen User mit einem Fake-Ban', options: [{ name: 'user', description: 'Wen willst du erschrecken?', type: 6, required: true }] }
    ];

    await c.application.commands.set(commands);
    console.log('🤖 Commands bereit.');

    checkTwitch();
    setInterval(checkTwitch, 120000); 

    // 💪 AGGRO TRAINER TIMER
    setInterval(() => {
        const channel = client.channels.cache.get(GYM_CHANNEL_ID);
        if (channel) {
            const randomTip = GYM_TIPS[Math.floor(Math.random() * GYM_TIPS.length)];
            channel.send(`**🦍 RÜHL SAGT:** ${randomTip}`);
        }
    }, 3600000); 

    c.user.setActivity('plant den WAAAGH!', { type: 3 }); 
});

// LOGIC: SNIPE LISTENER (Nachricht gelöscht)
client.on(Events.MessageDelete, message => {
    if (message.author && !message.author.bot) {
        snipes.set(message.channel.id, {
            content: message.content,
            author: message.author,
            image: message.attachments.first() ? message.attachments.first().proxyURL : null,
            timestamp: new Date().getTime()
        });
    }
});

// PASSIVE ORK REAKTIONEN, AUTO-MOD & AFK CHECK
client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return; 
    const content = message.content.toLowerCase();
    
    // 1. AFK Check: Ist der Autor wieder da?
    if (afkUsers.has(message.author.id)) {
        afkUsers.delete(message.author.id);
        message.reply(`👋 Willkommen zurück, **${message.author.username}**! AFK-Status entfernt.`);
    }

    // 2. AFK Check: Wurde ein AFK User erwähnt?
    message.mentions.users.forEach(user => {
        if (afkUsers.has(user.id)) {
            const reason = afkUsers.get(user.id);
            message.reply(`🤫 **${user.username}** ist gerade AFK: *"${reason}"*. Stör nicht!`);
        }
    });

    // 3. Auto-Mod
    if (BAD_WORDS.some(word => content.includes(word))) { try { await message.delete(); message.channel.send(`${message.author}, Maul! 🧼`).then(m => setTimeout(() => m.delete(), 5000)); return; } catch (e) {} }
    
    // 4. Passive Reaktionen
    if (content.includes('rot')) message.channel.send('**🔴 ROT IZ SCHNELLA!!!**');
    else if (content.includes('kampf') || content.includes('krieg')) message.channel.send('**⚔️ WAAAGH!!! MOSCH\'N!!!**');
    else if (content.includes('ballern')) message.channel.send('**🔫 MEHR DAKKA DAKKA DAKKA!**');
    else if (content.includes('holz')) message.channel.send('**🪵 Wir benötigen Holz, My Lord!**'); 
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
                if (query.includes('soundcloud.com')) { const soInfo = await play.soundcloud(query); stream = await play.stream_from_info(soInfo); title = soInfo.name; url = soInfo.url; }
                else { try { const ytInfo = await play.video_info(query); stream = await play.stream_from_info(ytInfo); title = ytInfo.video_details.title; url = ytInfo.video_details.url; } catch (e) { return interaction.editReply('YouTube (429) blockt. Nimm SoundCloud.'); } }
            } else {
                const search = await play.search(query, { source: { soundcloud: 'tracks' }, limit: 1 });
                if (search.length === 0) return interaction.editReply('Nix auf SoundCloud gefunden.');
                const info = search[0]; stream = await play.stream_from_info(info); title = info.name; url = info.url;
            }
            const resource = createAudioResource(stream.stream, { inputType: stream.type });
            player.play(resource); connection.subscribe(player);
            await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xFF5500).setTitle(`🎶 Spiele: ${title}`).setURL(url).setFooter({ text: 'Via SoundCloud 🟠' })] });
        } catch (error) { console.error(error); await interaction.editReply('Fehler: ' + error.message); }
    }
    // --- NEUE FEATURES (Giveaway, AFK, Snipe) ---
    else if (commandName === 'afk') {
        const reason = interaction.options.getString('grund') || 'Kein Grund angegeben';
        afkUsers.set(interaction.user.id, reason);
        await interaction.reply(`💤 Du bist jetzt **AFK**. Grund: *${reason}*.`);
    }
    else if (commandName === 'snipe') {
        const msg = snipes.get(interaction.channel.id);
        if (!msg) return interaction.reply({ content: 'Hier wurde nichts gelöscht (oder ich hab geschlafen).', flags: MessageFlags.Ephemeral });
        
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
            .setDescription(msg.content || '*Nur Bild*')
            .setFooter({ text: `Gelöscht vor ${Math.floor((new Date().getTime() - msg.timestamp) / 1000)} Sekunden` });
        if (msg.image) embed.setImage(msg.image);
        
        await interaction.reply({ content: '👀 **Erwischt!** Hier ist die gelöschte Nachricht:', embeds: [embed] });
    }
    else if (commandName === 'giveaway') {
        const prize = interaction.options.getString('preis');
        const duration = interaction.options.getInteger('dauer');
        
        const embed = new EmbedBuilder()
            .setColor(0x9146FF)
            .setTitle('🎁 GIVEAWAY! 🎉')
            .setDescription(`Preis: **${prize}**\n\nReagiere mit 🎉 um teilzunehmen!\nEndet in: **${duration} Minuten**`)
            .setFooter({ text: `Host: ${interaction.user.username}` });

        const message = await interaction.reply({ embeds: [embed], fetchReply: true });
        await message.react('🎉');

        setTimeout(async () => {
            const fetchedMsg = await interaction.channel.messages.fetch(message.id);
            const reactions = fetchedMsg.reactions.cache.get('🎉');
            const users = await reactions.users.fetch();
            const realUsers = users.filter(u => !u.bot);

            if (realUsers.size === 0) {
                interaction.channel.send(`Niemand wollte **${prize}**. Traurig.`);
            } else {
                const winner = realUsers.random();
                interaction.channel.send(`🎉 Herzlichen Glückwunsch ${winner}! Du hast **${prize}** gewonnen! 🏆`);
            }
        }, duration * 60 * 1000);
    }
    // --------------------------------------------
    else if (commandName === 'idee') {
        const idea = interaction.options.getString('vorschlag');
        const embed = new EmbedBuilder().setColor(0xFFA500).setTitle('💡 Neue Idee!').setDescription(idea).setFooter({ text: `Vorschlag von ${interaction.user.username}` });
        const msg = await interaction.reply({ embeds: [embed], fetchReply: true }); await msg.react('✅'); await msg.react('❌');
    }
    else if (commandName === 'timer') {
        const minutes = interaction.options.getInteger('minuten'); const reason = interaction.options.getString('grund') || 'Zeit abgelaufen!';
        await interaction.reply(`⏰ Timer gestellt auf **${minutes} Minuten**. (${reason})`);
        setTimeout(() => { interaction.channel.send(`${interaction.user}, **DEIN TIMER IST ABGELAUFEN!** 🔔\nGrund: ${reason}`); }, minutes * 60 * 1000);
    }
    else if (commandName === 'sag') {
        const channel = interaction.member.voice.channel;
        if (!channel) return interaction.reply('Geh erst in einen Voice-Channel!');
        const text = interaction.options.getString('text');
        playTTS(channel, text);
        await interaction.reply({ content: `🗣️ Spreche: "${text}"`, flags: MessageFlags.Ephemeral });
    }
    else if (commandName === 'pöbel') {
        const channel = interaction.member.voice.channel;
        if (!channel) return interaction.reply('Geh erst in einen Voice-Channel!');
        const target = interaction.options.getUser('opfer');
        const allRoasts = [...HANNO_KI_ROASTS, ...STREAMER_ROASTS];
        const randomRoast = allRoasts[Math.floor(Math.random() * allRoasts.length)];
        playTTS(channel, `${target.username}, ${randomRoast}`);
        await interaction.reply({ content: `🗣️ Pöbele gegen ${target.username}...`, flags: MessageFlags.Ephemeral });
    }
    else if (commandName === 'held') { const quote = HELD_QUOTES[Math.floor(Math.random() * HELD_QUOTES.length)]; await interaction.reply(`🧱 **Held der Steine:** "${quote}"`); }
    else if (commandName === 'waszocken') { const game = GAME_SUGGESTIONS[Math.floor(Math.random() * GAME_SUGGESTIONS.length)]; await interaction.reply(`🎮 **NekroBot empfiehlt:** ${game.name}\n*${game.comment}*`); }
    else if (commandName === 'fakeban') {
        const target = interaction.options.getUser('user');
        const embed = new EmbedBuilder().setColor(0xFF0000).setTitle('🚨 USER BANNED').setDescription(`**${target.username}** wurde permanent vom Server gebannt.`).setFooter({ text: 'Grund: Skill Issue' });
        await interaction.reply({ embeds: [embed] }); setTimeout(() => { interaction.editReply({ content: `Spaaaß! ${target} bleibt hier. Du Lellek. 🤡`, embeds: [] }); }, 4000);
    }
    else if (commandName === 'stop') { player.stop(); interaction.reply('Gestoppt.'); }
    else if (commandName === 'clear') { await interaction.channel.bulkDelete(interaction.options.getInteger('anzahl'), true); interaction.reply({ content: 'Gelöscht.', flags: MessageFlags.Ephemeral }); }
    else if (commandName === 'meme') { 
        const subreddits = ['HandOfMemes', 'zocken', 'ich_iel'];
        const randomSub = subreddits[Math.floor(Math.random() * subreddits.length)];
        try { const res = await axios.get(`https://meme-api.com/gimme/${randomSub}`); interaction.reply({ embeds: [new EmbedBuilder().setTitle(res.data.title).setImage(res.data.url).setFooter({ text: `Quelle: r/${randomSub}` })] }); } catch (e) { interaction.reply('Meme-Server pennt. 😴'); }
    }
    else if (commandName === 'ping') interaction.reply('Pong!');
    else if (commandName === 'website') interaction.reply({ content: 'https://riptzchen.github.io/riptzchen-website/', flags: MessageFlags.Ephemeral });
    else if (commandName === 'user') interaction.reply(`User: ${interaction.user.username}`);
    else if (commandName === 'orakel') {
        const question = interaction.options.getString('frage'); const answer = ORACLE_ANSWERS[Math.floor(Math.random() * ORACLE_ANSWERS.length)];
        const embed = new EmbedBuilder().setColor(0x000000).setTitle('🎱 Das Orakel hat gesprochen').addFields({ name: 'Frage', value: question }, { name: 'Antwort', value: `**${answer}**` }); await interaction.reply({ embeds: [embed] });
    }
    else if (commandName === 'roast') {
        const target = interaction.options.getUser('opfer'); const style = interaction.options.getString('stil') || 'toxic';
        let roast = ""; let prefix = "";
        if (style === 'ki') { roast = HANNO_KI_ROASTS[Math.floor(Math.random() * HANNO_KI_ROASTS.length)]; prefix = "🤖 **Hänno-KI:**"; }
        else if (style === 'ork') { roast = `DU BIST EIN KLEINA SNOTLING! WAAAGH!`; prefix = "🟢 **Ork:**"; }
        else { roast = STREAMER_ROASTS[Math.floor(Math.random() * STREAMER_ROASTS.length)]; prefix = "🤬 **Toxic:**"; }
        await interaction.reply(`${prefix} ${target}, ${roast}`);
    }
    else if (commandName === 'stronghold') { const quote = STRONGHOLD_QUOTES[Math.floor(Math.random() * STRONGHOLD_QUOTES.length)]; await interaction.reply(`📜 **Der Berater:** "${quote}"`); }
    else if (commandName === 'waaagh') { const quote = ORK_QUOTES[Math.floor(Math.random() * ORK_QUOTES.length)]; await interaction.reply(`**🟢 ${quote}**`); }
    else if (commandName === 'orkify') {
        let text = interaction.options.getString('text').toUpperCase();
        const dictionary = { "HALLO": "OI!", "TSCHÜSS": "ABFAHRT!", "MEIN": "MEINZ", "DEIN": "DEINZ", "FREUND": "BOY", "FREUNDE": "BOYZ", "FEIND": "GIT", "MENSCH": "HUMIE", "AUTO": "KARRE", "SCHNELL": "SCHNELLA", "ROT": "ROT (SCHNELLA!)", "KAMPF": "MOSCH'N", "KRIEG": "WAAAGH", "SCHIEßEN": "DAKKA MACHEN", "SCHIESSEN": "DAKKA MACHEN", "WIE GEHTS": "WAT IZ?", "GUT": "STABIL", "SCHLECHT": "GROTIG", "GELD": "ZÄHNE", "IST": "IZ", "NICHT": "NICH'", "UND": "UN'", "JA": "JO BOSS", "NEIN": "NIX DA" };
        for (const [key, value] of Object.entries(dictionary)) { const regex = new RegExp(`\\b${key}\\b`, 'g'); text = text.replace(regex, value); }
        text = text.replace(/!/g, "!!! WAAAGH!"); text = text.replace(/\./g, "!"); text = text.replace(/\?/g, "? HÄ?!");
        const suffix = [" WAAAGH!", " HÖHÖ!", " DAKKA DAKKA!", " BRUTAL!", ""][Math.floor(Math.random() * 5)];
        await interaction.reply(`🗣️ **${text}${suffix}**`);
    }
    else if (commandName === 'vote') {
        const question = interaction.options.getString('frage'); const embed = new EmbedBuilder().setColor(0x00FF00).setTitle('📊 UMFRAGE').setDescription(`**${question}**`).setFooter({ text: `Gestartet von ${interaction.user.username}` });
        const msg = await interaction.reply({ embeds: [embed], fetchReply: true }); await msg.react('👍'); await msg.react('👎');
    }
    else if (commandName === 'avatar') { const user = interaction.options.getUser('user') || interaction.user; const embed = new EmbedBuilder().setTitle(`Avatar von ${user.username}`).setColor(0x9146FF).setImage(user.displayAvatarURL({ dynamic: true, size: 1024 })); await interaction.reply({ embeds: [embed] }); }
    else if (commandName === 'dice') { const sides = interaction.options.getInteger('seiten') || 6; const roll = Math.floor(Math.random() * sides) + 1; await interaction.reply(`🎲 **Würfelwurf (W${sides}):** ${roll}`); }
    else if (commandName === 'serverinfo') { const guild = interaction.guild; const embed = new EmbedBuilder().setColor(0x0099FF).setTitle(`📊 Server-Infos: ${guild.name}`).setThumbnail(guild.iconURL()).addFields({ name: '👥 Member', value: `${guild.memberCount}`, inline: true }, { name: '📅 Erstellt am', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true }); await interaction.reply({ embeds: [embed] }); }
    else if (commandName === 'userinfo') { const user = interaction.options.getUser('user') || interaction.user; const member = await interaction.guild.members.fetch(user.id); const embed = new EmbedBuilder().setColor(member.displayHexColor).setTitle(`👤 Infos über ${user.username}`).setThumbnail(user.displayAvatarURL()).addFields({ name: '📅 Erstellt', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: false }, { name: '📥 Beigetreten', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: false }, { name: '📛 Rollen', value: member.roles.cache.map(r => r).join(' ').replace('@everyone', '') || 'Keine', inline: false }); await interaction.reply({ embeds: [embed] }); }
    else if (commandName === 'so') { const streamer = interaction.options.getString('streamer'); const embed = new EmbedBuilder().setColor(0x9146FF).setTitle(`📢 SHOUTOUT!`).setDescription(`**Ehrenmann-Alarm!**\nCheckt unbedingt **${streamer}** ab! Kuss auf die Nuss! 💜\n\n👉 https://twitch.tv/${streamer}`).setThumbnail('https://cdn-icons-png.flaticon.com/512/5968/5968819.png'); await interaction.reply({ embeds: [embed] }); }
    else if (commandName === 'münze') { const result = Math.random() < 0.5 ? '🪙 KOPF' : '🦅 ZAHL'; await interaction.reply(`Der Wurf sagt: **${result}**`); }
    else if (commandName === 'backseat') { const tip = ["Hättest du mal besser gelootet.", "Skill Issue.", "Mein kleiner Bruder spielt besser.", "Crosshair-Placement auf Kniehöhe."][Math.floor(Math.random() * 4)]; await interaction.reply(`🤓 **Backseat Gamer:** "${tip}"`); }
    else if (commandName === 'ssp') { const userChoice = interaction.options.getString('wahl'); const choices = ['schere', 'stein', 'papier']; const botChoice = choices[Math.floor(Math.random() * choices.length)]; let result = ""; if (userChoice === botChoice) result = "Unentschieden."; else if ((userChoice === 'schere' && botChoice === 'papier') || (userChoice === 'stein' && botChoice === 'schere') || (userChoice === 'papier' && botChoice === 'stein')) result = "Glückwunsch, du Cheater. 🎉"; else result = "Hah! Get rekt, Noob! 😎"; const emojis = { schere: '✂️', stein: '🪨', papier: '📄' }; await interaction.reply(`Du: ${emojis[userChoice]} vs. Ich: ${emojis[botChoice]}\n\n**${result}**`); }
    else if (commandName === 'duell') { const opponent = interaction.options.getUser('gegner'); const attacker = interaction.user; if (opponent.id === attacker.id) return interaction.reply('Bruder, du kannst dich nicht selbst schlagen.'); const winner = Math.random() < 0.5 ? attacker : opponent; const embed = new EmbedBuilder().setColor(0xFF0000).setTitle(`⚔️ 1vs1`).setDescription(`**${winner.username}** hat gewonnen!`); await interaction.reply({ embeds: [embed] }); }
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
                    channel.send({ content: `@everyone RIPtzchen live!`, embeds: [new EmbedBuilder().setColor(0x9146FF).setTitle(streamInfo.user_name).setURL(`https://twitch.tv/${TWITCH_USER_LOGIN}`).setDescription(streamInfo.title).setImage(streamInfo.thumbnail_url.replace('{width}', '1280').replace('{height}', '720') + `?t=${Date.now()}`)] });
                    client.user.setActivity('Stream', { type: 3 }); 
                }
            }
        } else { if (isLive) { isLive = false; client.user.setActivity('plant den WAAAGH!', { type: 3 }); } }
    } catch (e) { console.error('Twitch Check Fehler:', e.message); }
}

client.login(process.env.DISCORD_TOKEN);
