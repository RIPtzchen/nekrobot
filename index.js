require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, Events, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
// ✅ AUDIO & MUSIK SIND DRIN
const { joinVoiceChannel, createAudioPlayer, createAudioResource, generateDependencyReport, AudioPlayerStatus, getVoiceConnection } = require('@discordjs/voice');
const play = require('play-dl');
const axios = require('axios');
const express = require('express');
const sodium = require('libsodium-wrappers');

// --- ⚙️ KONFIGURATION ---
const TWITCH_USER_LOGIN = 'RIPtzchen'; 
const WELCOME_CHANNEL_ID = '1103895697582993561'; 
const RULES_CHANNEL_ID   = '1103895697582993562';     
const ROLES_CHANNEL_ID   = '1103895697582993568';     
const AUTO_ROLE_ID       = '1462020482722172958'; 
const GYM_CHANNEL_ID     = '1462193628347895899'; 
const EMBED_COLOR        = 0x8B0000; // 🩸 BLUTROT

const BAD_WORDS = ['hurensohn', 'hs', 'wichser', 'fortnite', 'schalke', 'bastard', 'lappen']; 

// 💾 SPEICHER & VARIABLEN
const snipes = new Map();
const afkUsers = new Map();
const voiceSessions = new Map();
let disconnectTimer = null;
let isLive = false; 

// 🎱 CONTENT LISTEN
const ORACLE_ANSWERS = ["Träum weiter.", "Sicher... nicht.", "Frag wen, den es interessiert.", "404: Motivation not found.", "Ja, aber du wirst es bereuen.", "Deine Chancen stehen schlechter als mein Code.", "Lösch dich.", "Absolut.", "Vielleicht, wenn du bettelst.", "Nein. Einfach nein."];
const RICK_ROASTS = ["ICH BIN EINE GURKE! Boom!", "Hör zu, Morty... äh [User]. Deine Dummheit erzeugt eine eigene Schwerkraft.", "Dein Gehirn ist wie ein Browser mit 500 Tabs offen, aber keinem Internet.", "Mathematisch gesehen ist die Wahrscheinlichkeit, dass du jemals etwas Nützliches beiträgst, gleich Null.", "Wubba Lubba Dub Dub!", "Niemand existiert absichtlich. Niemand gehört irgendwohin. Geh Fernsehen gucken.", "Ich habe Bakterien in meinem Darm gesehen, die ein komplexeres Sozialleben haben als du.", "Für dich brauche ich keine Portal-Gun. Ich wünschte einfach, du wärst weg.", "Deine Meinung bedeutet mir sehr wenig.", "Wow. Einfach wow. So viel Inkompetenz."];
const DIMENSIONS = ["🌌 **Arsch-Welt:** Alles ist voller Ärsche. Es furzt ständig.", "🍕 **Pizza-Welt:** Sofas bestellen Pizza-Menschen.", "🤖 **Roboter-Welt:** Du bist eine Batterie.", "🤠 **Schreiende-Sonne-Welt:** AAAAAHHHH!!!", "🌽 **Mais-Welt:** Alles ist Mais.", "🐹 **Hamster-im-Hintern-Welt:** Frag nicht.", "🚽 **Klo-Welt:** Eine Welt nur aus Toiletten.", "🦟 **Cromulon-Dimension:** ZEIGT MIR, WAS IHR KÖNNT!", "🐍 **Schlangen-Jazz-Welt:** Tss tss tsss tss.", "🪑 **Stuhl-Welt:** Menschen sind Stühle."];
const HELD_QUOTES = ["Welt seid mir gegrüßt! Ich bin der Held der Steine!", "Nichts vor dem man sich fürchten müsste.", "Lack gesoffen? Teuer! Das ist ja hanebüchen!", "Das ist keine Funktion, das ist ein Abenteuer!", "Schaut euch das an... eine Farbseuche!", "Fuchs, du hast die Gans gestohlen... gib sie wieder her!", "Wir schauen uns das Elend mal gemeinsam an.", "Großartig. Einfach großartig (sarkastisch)."];
const GAME_SUGGESTIONS = [{name: "League of Legends", comment: "Schmerzen."}, {name: "Warhammer 40k: Darktide", comment: "FÜR DEN IMPERATOR!"}, {name: "Valorant", comment: "Klick Köpfe."}, {name: "Elden Ring", comment: "Zeit zu sterben."}, {name: "Minecraft", comment: "Klötzchen bauen."}, {name: "Counter-Strike 2", comment: "Rush B!"}, {name: "Euro Truck Simulator", comment: "Hup Hup!"}, {name: "World of Warcraft", comment: "Für die Horde/Allianz!"}, {name: "Fortnite", comment: "Bauen!"}, {name: "Just Chatting", comment: "Laberflash."}];
const HANNO_KI_ROASTS = ["Ich bin die optimierte Version. Du bist nur Schmutz.", "Geringbäcker!", "Lösch dich einfach.", "Hast du überhaupt Prime, du Lellek?", "Mein Code ist perfekt. Dein Aim ist ein Bug.", "Tastaturakrobat!", "Komm mal klar auf dein Leben, du NPC.", "Sieh es ein: Ich bin die Zukunft. Du bist Retro-Müll."];
const STREAMER_ROASTS = ["Digga, du bist so ein Bot, lösch dich einfach.", "Was für ein Schmutz-Move.", "Bruder, dein Aim ist wie dein IQ: Nicht vorhanden.", "Halt die Gosch'n, du Lellek.", "Junge, guck dich doch mal an. Einfach bodenlos.", "Du bist so ein 31er.", "WAS MACHST DU DENN DA?!", "Get on my lvl, du Rentner.", "Ich glaub es hackt!", "Schleich dich, du Knecht!"];
const STRONGHOLD_QUOTES = ["Eure Beliebtheit sinkt, My Lord!", "Die Vorräte schwinden dahin...", "Wir benötigen Holz!", "Die Leute verlassen die Burg.", "Eine Nachricht von der Ratte: *quiek*", "Die Schatzkammer leert sich!", "Es sind nicht genügend Arbeiter vorhanden!", "Ihr könnt das nicht dort platzieren, My Lord!", "Das Volk liebt euch, Sire! (Scherz)."];
const ORK_QUOTES = ["WAAAGH!!!", "DAKKA DAKKA DAKKA!", "ROT IS SCHNELLA!", "MEHR DAKKA!", "GELB MACHT BUMM!", "MOSCH'N!", "GRÜN IZ DA BESTE!", "WIA GEH'N JETS KÖPPE EINSCHLAG'N!", "SCHNELLA IHR GITS!", "MEIN SPALTA JUCKT!"];

// 🦍 RÜHL LEGENDARY QUOTES (Massive Expansion)
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
    "Wenn ich so aussehen würde wie du, würde ich lachend in ne Kreissäge laufen! 🪚",
    "Stabil bleiben, Junge! Nicht wackeln wie ein Lämmerschwanz!",
    "Das Gewicht muss hoch, die Ausführung ist zweitrangig! 😤",
    "Thunfischproteinshake! Rein damit, Kopf in Nacken! 🤮",
    "Du siehst aus wie ein gekochtes Spargelgemüse! Ab ans Eisen!",
    "Breit gebaut, braun gebrannt, 100 Kilo Hantelbank! (Zumindest im Traum, oder?)",
    "Hör auf zu heulen, trainier gefälligst!",
    "Massephase ist das ganze Jahr! Friss!",
    "Falsch trainiert ist besser als gar nicht trainiert! Auf geht's!",
    "Reis und Pute, Reis und Pute. Das ist das Geheimnis! 🍚🦃",
    "Geh mir aus der Sonne, du wirfst Schatten auf meinen Bizeps! 💪",
    "Was ist das denn für ein Kindergewicht? Pack was drauf!",
    "Discopumper-Alarm! Beine trainieren nicht vergessen! 🦵",
    "Bizeps sieht gut aus, aber der Rest ist Kacke! Weiter!",
    "Schlafen kannste, wenn du tot bist! Jetzt wird gepumpt!",
    "Was machst du da? Synchronschwimmen oder Hanteltraining?",
    "Die Hantel wiegt ja nix! Spielzeug!",
    "Mehr essen! Du fällst ja vom Fleisch!",
    "Konzentration! Das ist kein Kaffeekränzchen hier!",
    "Junge, mach dich mal gerade, du hängst da wie ein Schluck Wasser in der Kurve!",
    "Keine Schmerzen, kein Wachstum! Weitermachen!",
    "Wer breit sein will, muss leiden! Heul leise!",
    "Sieht aus wie Mikado bei dir, pass auf dass du nicht zerbrichst!",
    "Ohne Mampf kein Dampf! Wo ist dein Meal-Prep?",
    "Cardio? Kann man das essen? Ab an die Hantel!",
    "Das ist Styropor, kein Gewicht! Mach schwerer!",
    "Schultern wie Kanonenkugeln, das ist das Ziel! Nicht so Erbsen wie bei dir!"
];

// --- AUDIO PLAYER (Für Musik) ---
const player = createAudioPlayer();

// Auto-Disconnect (Wenn Musik zu Ende ist)
player.on(AudioPlayerStatus.Idle, () => {
    if (disconnectTimer) clearTimeout(disconnectTimer);
    disconnectTimer = setTimeout(() => {
        if (player.state.status === AudioPlayerStatus.Idle) {
            const guildId = client.guilds.cache.first()?.id;
            if (guildId) {
                const connection = getVoiceConnection(guildId);
                if (connection) connection.destroy();
            }
        }
    }, 5000); // 5 Sek warten
});
player.on(AudioPlayerStatus.Playing, () => { if (disconnectTimer) clearTimeout(disconnectTimer); });
player.on('error', error => { console.error('Audio Player Error:', error.message); });

// --- WEBSERVER (UptimeRobot) ---
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('NekroBot Music + Trainer (2h). 🎶💪'));
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

client.once(Events.ClientReady, async c => {
    console.log(`⏳ Warte auf Software-Verschlüsselung...`);
    await sodium.ready; 
    console.log(`🔐 Verschlüsselung bereit!`);
    console.log(`🤖 ${c.user.tag} ist online!`);
    
    // Voice Tracker Init
    c.guilds.cache.forEach(guild => {
        guild.voiceStates.cache.forEach(vs => {
            if (vs.channelId && !vs.member.user.bot) { voiceSessions.set(vs.member.id, Date.now()); }
        });
    });
    
    try {
        const client_id = await play.getFreeClientID();
        await play.setToken({ soundcloud: { client_id: client_id } });
    } catch (err) { console.error('⚠️ SC Auth Fehler:', err.message); }

    const commands = [
        { name: 'setup', description: 'Zeigt dein PC-Setup (Razer Fanboy Edition)' },
        { name: 'ping', description: 'Checkt, ob der Bot wach ist' },
        { name: 'website', description: 'Link zum HQ' },
        { name: 'user', description: 'Infos über einen User (Stalking Mode)', options: [{ name: 'user', description: 'Wen willst du checken?', type: 6, required: false }] },
        { name: 'clear', description: 'Löscht Nachrichten', defaultMemberPermissions: PermissionFlagsBits.ManageMessages, options: [{ name: 'anzahl', description: 'Menge (1-100)', type: 4, required: true }] },
        // 🎵 MUSIK BEFEHLE
        { name: 'play', description: 'Spielt Musik (SoundCloud)', options: [{ name: 'song', description: 'Suche oder Link', type: 3, required: true }] },
        { name: 'stop', description: 'Stoppt Musik' },
        // NO TTS
        { name: 'meme', description: 'Gamer Memes' },
        { name: 'held', description: 'Held der Steine 🧱' }, 
        { name: 'waaagh', description: 'Ork Schrei!' },
        { name: 'stronghold', description: 'Der Berater' },
        { name: 'waszocken', description: 'Game Entscheidung' },
        { name: 'orkify', description: 'Text zu Ork', options: [{ name: 'text', description: 'Text', type: 3, required: true }] },
        { name: 'orakel', description: 'Orakel befragen', options: [{ name: 'frage', description: 'Frage', type: 3, required: true }] },
        { name: 'portal', description: 'Rick & Morty Portal 🌀' },
        { name: 'jerry', description: 'Du bist ein Jerry', options: [{ name: 'user', description: 'Wer?', type: 6, required: true }] },
        { name: 'roast', description: 'Beleidige einen User (Text)', options: [{ name: 'opfer', description: 'Wen?', type: 6, required: true }, { name: 'stil', description: 'Style?', type: 3, required: false, choices: [{name: 'Rick 🧪', value: 'rick'}, {name: 'Hänno 🤖', value: 'ki'}, {name: 'Toxic 🤬', value: 'toxic'}, {name: 'Ork 🟢', value: 'ork'}] } ]},
        { name: 'vote', description: 'Umfrage starten', options: [{ name: 'frage', description: 'Frage?', type: 3, required: true }] },
        { name: 'idee', description: 'Idee einreichen', options: [{ name: 'vorschlag', description: 'Idee', type: 3, required: true }] },
        { name: 'timer', description: 'Wecker stellen', options: [{ name: 'minuten', description: 'Minuten', type: 4, required: true }, { name: 'grund', description: 'Grund', type: 3, required: false }] },
        { name: 'serverinfo', description: 'Server Stats' },
        { name: 'avatar', description: 'Avatar anzeigen', options: [{ name: 'user', description: 'Wer?', type: 6, required: false }] },
        { name: 'giveaway', description: 'Giveaway starten', options: [{ name: 'preis', description: 'Preis', type: 3, required: true }, { name: 'dauer', description: 'Minuten', type: 4, required: true }] },
        { name: 'afk', description: 'AFK gehen', options: [{ name: 'grund', description: 'Grund', type: 3, required: false }] },
        { name: 'snipe', description: 'Gelöschte Nachricht zeigen' },
        { name: 'so', description: 'Shoutout', options: [{ name: 'streamer', description: 'Name', type: 3, required: true }] },
        { name: 'münze', description: 'Münzwurf' },
        { name: 'dice', description: 'Würfeln', options: [{ name: 'seiten', description: 'Seiten', type: 4, required: false }] },
        { name: 'duell', description: '1vs1', options: [{ name: 'gegner', description: 'Gegner', type: 6, required: true }] },
        { name: 'ssp', description: 'Schere Stein Papier', options: [{ name: 'wahl', description: 'Wahl', type: 3, required: true, choices: [{ name: 'Schere ✂️', value: 'schere' }, { name: 'Stein 🪨', value: 'stein' }, { name: 'Papier 📄', value: 'papier' }] }] },
        { name: 'backseat', description: 'Backseat Gaming Tipp' },
        { name: 'fakeban', description: 'Fake Ban Troll', options: [{ name: 'user', description: 'Wen?', type: 6, required: true }] }
    ];

    await c.application.commands.set(commands);
    console.log('🤖 Commands bereit.');

    checkTwitch();
    setInterval(checkTwitch, 120000); 

    // 💪 AGGRO TRAINER (ALLE 2 STUNDEN)
    setInterval(() => {
        const channel = client.channels.cache.get(GYM_CHANNEL_ID);
        if (!channel) return;
        const randomTip = GYM_TIPS[Math.floor(Math.random() * GYM_TIPS.length)];
        const now = Date.now();
        const lazyUsers = [];
        
        voiceSessions.forEach((startTime, userId) => {
            const guild = channel.guild;
            const member = guild.members.cache.get(userId);
            // 7200000 = 2 Stunden (120 Minuten)
            if (member && member.voice.channelId && (now - startTime >= 7200000)) { 
                lazyUsers.push(userId); 
            }
        });

        if (lazyUsers.length > 0) {
            const victimId = lazyUsers[Math.floor(Math.random() * lazyUsers.length)];
            channel.send(`**🦍 RÜHL ALARM:** <@${victimId}>, du Masthuhn hockst seit über 2 Stunden im Voice! Beweg deinen Arsch! ${randomTip}`);
            voiceSessions.set(victimId, Date.now()); // Timer Reset
        } 
    }, 60000); // Check jede Minute

    c.user.setActivity('plant den WAAAGH!', { type: 3 }); 
});

// LOGIC: SNIPE
client.on(Events.MessageDelete, message => {
    if (message.author && !message.author.bot) {
        snipes.set(message.channel.id, { content: message.content, author: message.author, image: message.attachments.first() ? message.attachments.first().proxyURL : null, timestamp: new Date().getTime() });
    }
});

// VOICE STATE (WICHTIG FÜR TRAINER)
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    const memberId = newState.member.id;
    if (newState.member.user.bot) return; 
    // User kommt rein
    if (!oldState.channelId && newState.channelId) { voiceSessions.set(memberId, Date.now()); }
    // User geht raus
    else if (oldState.channelId && !newState.channelId) { voiceSessions.delete(memberId); }
});

// PASSIVE REAKTIONEN
client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return; 
    const content = message.content.toLowerCase();
    
    if (afkUsers.has(message.author.id)) { afkUsers.delete(message.author.id); message.reply(`👋 Willkommen zurück, **${message.author.username}**! AFK-Status entfernt.`); }
    message.mentions.users.forEach(user => { if (afkUsers.has(user.id)) { message.reply(`🤫 **${user.username}** ist gerade AFK: *"${afkUsers.get(user.id)}"*. Stör nicht!`); } });

    if (BAD_WORDS.some(word => content.includes(word))) { try { await message.delete(); message.channel.send(`${message.author}, Maul! 🧼`).then(m => setTimeout(() => m.delete(), 5000)); return; } catch (e) {} }
    
    if (content.includes('rot')) message.channel.send('**🔴 ROT IZ SCHNELLA!!!**');
    else if (content.includes('kampf') || content.includes('krieg')) message.channel.send('**⚔️ WAAAGH!!! MOSCH\'N!!!**');
    else if (content.includes('ballern')) message.channel.send('**🔫 MEHR DAKKA DAKKA DAKKA!**');
    else if (content.includes('holz')) message.channel.send('**🪵 Wir benötigen Holz, My Lord!**'); 
    if (content.includes('gurke') || content.includes('pickle')) message.channel.send('**🥒 ICH BIN EINE GURKE! GURKEN-RICK!**');
});

// COMMANDS
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    try {
        // --- 🎵 MUSIK PLAYER ---
        if (commandName === 'play') {
            await interaction.deferReply();
            const channel = interaction.member.voice.channel;
            if (!channel) return interaction.editReply('Geh in Voice!');
            const query = interaction.options.getString('song');
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
            await interaction.editReply({ embeds: [new EmbedBuilder().setColor(EMBED_COLOR).setTitle(`🎶 Spiele: ${title}`).setURL(url).setFooter({ text: 'Via SoundCloud 🟠' })] });
        }
        else if (commandName === 'stop') { 
            player.stop(); 
            interaction.reply('Gestoppt.'); 
        }

        // --- SONSTIGE BEFEHLE ---
        else if (commandName === 'setup') {
            const embed = new EmbedBuilder().setColor(EMBED_COLOR).setTitle('🖥️ RIPtzchen\'s Setup (Razer Fanboy Edition)').setThumbnail('https://upload.wikimedia.org/wikipedia/en/thumb/4/40/Razer_Inc._logo.svg/1200px-Razer_Inc._logo.svg.png').addFields({ name: '🐍 Peripherie', value: 'Alles von Razer (Was sonst?)', inline: true }, { name: '🖱️ Maus', value: 'Razer Basilisk / Viper', inline: true }, { name: '⌨️ Tastatur', value: 'Razer BlackWidow / Huntsman', inline: true }, { name: '🎧 Headset', value: 'Razer Kraken / BlackShark', inline: true }, { name: '💻 CPU', value: 'High-End Intel/AMD (Ballert)', inline: true }, { name: '📺 GPU', value: 'NVIDIA RTX Monster', inline: true }).setFooter({ text: 'Chroma RGB +100 Skill' });
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'website') {
            await interaction.reply({ content: `🌐 **Besuch das Hauptquartier!**\nHier gibt's alle Infos:\n👉 https://riptzchen.github.io/riptzchen-website/`, ephemeral: true });
        }
        else if (commandName === 'ping') {
            await interaction.reply(`🏓 **PONG!**\nBin wach und bereit für Chaos! (Latenz: ${Date.now() - interaction.createdTimestamp}ms)`);
        }
        else if (commandName === 'user') {
            const user = interaction.options.getUser('user') || interaction.user;
            const member = await interaction.guild.members.fetch(user.id);
            const embed = new EmbedBuilder().setColor(EMBED_COLOR).setTitle(`👤 Akte: ${user.username}`).setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 })).addFields({ name: '📅 Account erstellt', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: false }, { name: '📥 Dem Server beigetreten', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: false }, { name: '📛 Rollen', value: member.roles.cache.map(r => r).join(' ').replace('@everyone', '') || 'Keine', inline: false }).setFooter({ text: 'Stalking Mode: ON' });
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'roast') { 
            const target = interaction.options.getUser('opfer'); 
            const style = interaction.options.getString('stil') || 'toxic'; 
            let roast = ""; let prefix = ""; 
            if (style === 'ki') { roast = HANNO_KI_ROASTS[Math.floor(Math.random() * HANNO_KI_ROASTS.length)]; prefix = "🤖 **Hänno-KI:**"; } 
            else if (style === 'ork') { roast = `DU BIST EIN KLEINA SNOTLING! WAAAGH!`; prefix = "🟢 **Ork:**"; } 
            else if (style === 'rick') { roast = RICK_ROASTS[Math.floor(Math.random() * RICK_ROASTS.length)]; roast = roast.replace('[User]', target.username); prefix = "🧪 **Rick:**"; } 
            else { roast = STREAMER_ROASTS[Math.floor(Math.random() * STREAMER_ROASTS.length)]; prefix = "🤬 **Toxic:**"; } 
            await interaction.reply(`${prefix} ${target}, ${roast}`); 
        }
        else if (commandName === 'timer') { 
            const minutes = interaction.options.getInteger('minuten'); 
            const reason = interaction.options.getString('grund') || 'Timer'; 
            await interaction.reply(`⏰ Timer gestellt auf **${minutes} Minuten**. (${reason})`); 
            setTimeout(() => { interaction.channel.send(`${interaction.user}, **DEIN TIMER IST ABGELAUFEN!** 🔔\nGrund: ${reason}`); }, minutes * 60 * 1000); 
        }
        else if (commandName === 'portal') { await interaction.reply(`🌀 *ZAP!* **Portal geöffnet:**\n${DIMENSIONS[Math.floor(Math.random() * DIMENSIONS.length)]}`); }
        else if (commandName === 'jerry') { const user = interaction.options.getUser('user'); await interaction.reply(`**🧪 Rick zu ${user}:** "Geh in deine Ecke und spiel mit deinem Tablet, Jerry."`); }
        else if (commandName === 'afk') { const reason = interaction.options.getString('grund') || 'Kein Grund'; afkUsers.set(interaction.user.id, reason); await interaction.reply(`💤 Du bist jetzt **AFK**. Grund: *${reason}*.`); }
        else if (commandName === 'snipe') { const msg = snipes.get(interaction.channel.id); if (!msg) return interaction.reply({ content: 'Nichts gefunden.', ephemeral: true }); const embed = new EmbedBuilder().setColor(EMBED_COLOR).setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() }).setDescription(msg.content || '*Bild*').setFooter({ text: 'Gelöscht' }); if(msg.image) embed.setImage(msg.image); await interaction.reply({ embeds: [embed] }); }
        else if (commandName === 'giveaway') { const p = interaction.options.getString('preis'); const d = interaction.options.getInteger('dauer'); const e = new EmbedBuilder().setColor(EMBED_COLOR).setTitle('🎁 GIVEAWAY!').setDescription(`Preis: **${p}**\nEndet in: **${d} Min**`); const m = await interaction.reply({ embeds: [e], fetchReply: true }); await m.react('🎉'); setTimeout(async()=>{ const f=await interaction.channel.messages.fetch(m.id); const u=await f.reactions.cache.get('🎉').users.fetch(); const w=u.filter(x=>!x.bot).random(); interaction.channel.send(w ? `🎉 GW ${w}! Preis: **${p}**` : 'Niemand wollte es.'); }, d*60000); }
        else if (commandName === 'idee') { const i = interaction.options.getString('vorschlag'); const e = new EmbedBuilder().setColor(EMBED_COLOR).setTitle('💡 Idee').setDescription(i).setFooter({ text: interaction.user.username }); const m = await interaction.reply({ embeds: [e], fetchReply: true }); await m.react('✅'); await m.react('❌'); }
        else if (commandName === 'held') { await interaction.reply(`🧱 **Held:** "${HELD_QUOTES[Math.floor(Math.random() * HELD_QUOTES.length)]}"`); }
        else if (commandName === 'waszocken') { const g = GAME_SUGGESTIONS[Math.floor(Math.random() * GAME_SUGGESTIONS.length)]; await interaction.reply(`🎮 **Game:** ${g.name} - *${g.comment}*`); }
        else if (commandName === 'fakeban') { await interaction.reply({ embeds: [new EmbedBuilder().setColor(EMBED_COLOR).setTitle('🚨 BANNED').setDescription(`**${interaction.options.getUser('user').username}** gebannt.`).setFooter({ text: 'Skill Issue' })] }); setTimeout(() => interaction.editReply({ content: 'Spaß! 🤡', embeds: [] }), 4000); }
        else if (commandName === 'clear') { await interaction.channel.bulkDelete(interaction.options.getInteger('anzahl'), true); interaction.reply({ content: 'Gelöscht.', ephemeral: true }); }
        else if (commandName === 'meme') { try { const r = await axios.get(`https://meme-api.com/gimme/zocken`); interaction.reply({ embeds: [new EmbedBuilder().setColor(EMBED_COLOR).setTitle(r.data.title).setImage(r.data.url)] }); } catch { interaction.reply('Meme Fehler.'); } }
        else if (commandName === 'orakel') { const a = ORACLE_ANSWERS[Math.floor(Math.random() * ORACLE_ANSWERS.length)]; await interaction.reply(`🎱 **Orakel:** ${a}`); }
        else if (commandName === 'stronghold') { await interaction.reply(`📜 **Berater:** "${STRONGHOLD_QUOTES[Math.floor(Math.random() * STRONGHOLD_QUOTES.length)]}"`); }
        else if (commandName === 'waaagh') { await interaction.reply(`**🟢 ${ORK_QUOTES[Math.floor(Math.random() * ORK_QUOTES.length)]}**`); }
        else if (commandName === 'orkify') { let t = interaction.options.getString('text').toUpperCase().replace(/UND/g, "UN'").replace(/ICH/g, "ICKE"); await interaction.reply(`🗣️ **${t} WAAAGH!**`); }
        else if (commandName === 'vote') { const e = new EmbedBuilder().setColor(EMBED_COLOR).setTitle('📊 Vote').setDescription(interaction.options.getString('frage')); const m = await interaction.reply({ embeds: [e], fetchReply: true }); await m.react('👍'); await m.react('👎'); }
        else if (commandName === 'avatar') { const u = interaction.options.getUser('user') || interaction.user; await interaction.reply({ embeds: [new EmbedBuilder().setTitle(u.username).setColor(EMBED_COLOR).setImage(u.displayAvatarURL({ dynamic: true, size: 1024 }))] }); }
        else if (commandName === 'dice') { await interaction.reply(`🎲 **${Math.floor(Math.random() * (interaction.options.getInteger('seiten') || 6)) + 1}**`); }
        else if (commandName === 'serverinfo') { await interaction.reply({ embeds: [new EmbedBuilder().setColor(EMBED_COLOR).setTitle(interaction.guild.name).addFields({ name: 'Member', value: `${interaction.guild.memberCount}` })] }); }
        else if (commandName === 'so') { await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x9146FF).setTitle('📢 SHOUTOUT!').setDescription(`Check **${interaction.options.getString('streamer')}** ab!\n👉 https://twitch.tv/${interaction.options.getString('streamer')}`)] }); }
        else if (commandName === 'münze') { await interaction.reply(Math.random() < 0.5 ? '🪙 KOPF' : '🦅 ZAHL'); }
        else if (commandName === 'backseat') { await interaction.reply(`🤓 "Hättest du mal besser gelootet."`); }
        else if (commandName === 'ssp') { await interaction.reply("Schere Stein Papier: Bot gewinnt. (Immer)."); }
        else if (commandName === 'duell') { await interaction.reply(`⚔️ **${Math.random() < 0.5 ? interaction.user.username : interaction.options.getUser('gegner').username}** hat gewonnen!`); }

    } catch (e) {
        console.error('Interaction Error:', e);
    }
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
