require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, Events, MessageFlags, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');
const express = require('express');

// --- ⚙️ KONFIGURATION ---
const TWITCH_USER_LOGIN = 'RIPtzchen'; 

// DEINE IDs:
const WELCOME_CHANNEL_ID = '1103895697582993561'; 
const RULES_CHANNEL_ID   = '1103895697582993562';     
const ROLES_CHANNEL_ID   = '1103895697582993568';     
const AUTO_ROLE_ID       = '1462020482722172958'; 

// 🤬 AUTO-MOD LISTE
const BAD_WORDS = ['hurensohn', 'hs', 'wichser', 'fortnite', 'schalke', 'bastard', 'lappen']; 

let isLive = false;

// --- FAKE WEBSERVER ---
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('NekroBot: Wachsam. 👁️'));
app.listen(port, () => console.log(`🌍 Webserver läuft auf Port ${port}`));

// --- DISCORD CLIENT ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent 
    ]
});

// --- EVENTS ---
client.once(Events.ClientReady, async c => {
    console.log(`✅ ${c.user.tag} ist online.`);
    
    // ALLE BEFEHLE (Jetzt auch mit /clear)
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
            options: [{
                name: 'anzahl',
                description: 'Wie viele Nachrichten sollen weg?',
                type: 4, // Integer
                required: true
            }]
        }
    ];

    // Befehle global registrieren
    await c.application.commands.set(commands);
    console.log('🤖 Slash-Commands wurden aktualisiert!');

    checkTwitch();
    setInterval(checkTwitch, 120000); 
    c.user.setActivity('Sammelt Seelen im Chat', { type: 0 });
});

// 🛡️ AUTO-MODERATION
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

// 💀 WELCOME + AUTO ROLE
client.on(Events.GuildMemberAdd, async member => {
    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (channel) {
        const welcomeEmbed = new EmbedBuilder()
            .setColor(0xFFFF00) 
            .setTitle(`⚠️ SYSTEM-ALARM: ENTITY DETECTED ⚠️`)
            .setDescription(
                `☣️ Subjekt ${member} ist im **Sektor RIPz** gespawned.\n` +
                `Status: **Lag-Opfer** (Verifizierung läuft...).\n\n` +
                `**💀 PROTOKOLL GESTARTET:**\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
                `1️⃣ **INHALIEREN:** <#${RULES_CHANNEL_ID}>\n` +
                `2️⃣ **IDENTIFIZIEREN:** <#${ROLES_CHANNEL_ID}>\n` +
                `3️⃣ **ESKALIEREN:** Sei kein NPC!\n` +
                `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n*Glory to the Cyber-Shinigami.* ⛩️`
            )
            .setThumbnail(member.user.displayAvatarURL()) 
            .setTimestamp();
        channel.send({ content: `**ALARM!** ${member} hat die Barriere durchbrochen!`, embeds: [welcomeEmbed] });
    }
    try {
        const role = member.guild.roles.cache.get(AUTO_ROLE_ID);
        if (role) await member.roles.add(role);
    } catch (e) { console.error('Auto-Role Fehler:', e); }
});

// --- COMMANDS ---
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    // 🧹 CLEAR COMMAND (NEU)
    if (commandName === 'clear') {
        const amount = interaction.options.getInteger('anzahl');
        
        if (amount < 1 || amount > 100) {
            return interaction.reply({ content: 'Bitte eine Zahl zwischen 1 und 100 eingeben!', flags: MessageFlags.Ephemeral });
        }
        
        // Löschen
        await interaction.channel.bulkDelete(amount, true).catch(err => {
            console.error(err);
            return interaction.reply({ content: 'Fehler beim Löschen (Nachrichten zu alt?)', flags: MessageFlags.Ephemeral });
        });

        return interaction.reply({ content: `🧹 Habe ${amount} Nachrichten ins Jenseits befördert.`, flags: MessageFlags.Ephemeral });
    }

    // 🤡 MEME
    else if (commandName === 'meme') {
        await interaction.deferReply();
        try {
            const res = await axios.get('https://meme-api.com/gimme/ich_iel'); 
            const meme = res.data;
            if(meme.nsfw) return interaction.editReply('Pfui! Das war NSFW. 🔞');
            const memeEmbed = new EmbedBuilder()
                .setColor(0x99AAB5)
                .setTitle(meme.title)
                .setURL(meme.postLink)
                .setImage(meme.url)
                .setFooter({ text: `👍 ${meme.ups} | r/ich_iel` });
            await interaction.editReply({ embeds: [memeEmbed] });
        } catch (error) { await interaction.editReply('Keine Memes gefunden.'); }
    }

    // --- REST ---
    else if (commandName === 'setup') {
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
                    const liveEmbed = new EmbedBuilder().setColor(0x9146FF).setTitle(`🚨 ALARM: ${streamInfo.user_name} ist LIVE!`).setURL(`https://twitch.tv/${TWITCH_USER_LOGIN}`).setDescription(`**${streamInfo.title}**`).setImage(streamInfo.thumbnail_url.replace('{width}', '1280').replace('{height}', '720') + `?t=${Date.now()}`);
                    channel.send({ content: `@everyone RIPtzchen ist on air!`, embeds: [liveEmbed] });
                    client.user.setActivity('RIPtzchen im Stream zu', { type: 3 }); 
                }
            }
        } else {
            if (isLive) { isLive = false; client.user.setActivity('Sammelt Seelen im Chat', { type: 0 }); }
        }
    } catch (error) { console.error('Twitch Check Fehler:', error.message); }
}

client.login(process.env.DISCORD_TOKEN);
