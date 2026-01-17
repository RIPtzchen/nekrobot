require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, Events, MessageFlags } = require('discord.js');
const axios = require('axios');
const express = require('express'); // <-- NEU: Webserver

// --- FAKE WEBSERVER (Damit der Cloud-Hoster glücklich ist) ---
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('NekroBot ist online und bewacht den Server! 🤖');
});

app.listen(port, () => {
    console.log(`🌍 Fake-Webserver läuft auf Port ${port}`);
});
// -------------------------------------------------------------

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// EVENT: Bot ist bereit
client.once(Events.ClientReady, c => {
    console.log(`✅ ${c.user.tag} ist online.`);
    c.user.setActivity('Riptzchens RTX 5070 beim Rendern zu', { type: 3 }); 
});

// EVENT: Interaktion (Commands)
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
                .setTitle(`🖥️ ${data.pc_name || 'Riptzchens Setup'}`)
                .setURL('https://riptzchen.github.io/riptzchen-website/')
                .setDescription(`*${data.status || 'Gaming Mode On'}* \nBesitzer: **${data.owner || 'Riptzchen'}**`)
                .setThumbnail('https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png')
                .addFields(
                    { name: '\u200B', value: '**🔥 Die Hardware**' },
                    { name: 'Grafikkarte', value: data.specs.gpu || 'Unbekannt', inline: true },
                    { name: 'Prozessor', value: data.specs.cpu || 'Unbekannt', inline: true },
                    { name: 'RAM', value: data.specs.ram || 'Unbekannt', inline: true },
                    { name: '\u200B', value: '**🖱️ Peripherie**' },
                    { name: 'Tastatur', value: data.peripherals.keyboard || 'Standard', inline: true },
                    { name: 'Maus', value: data.peripherals.mouse || 'Standard', inline: true },
                    { name: 'Mic & Cam', value: `${data.peripherals.mic || '-'} \n ${data.peripherals.camera || '-'}`, inline: true },
                )
                .setFooter({ text: `Update: ${data.last_updated} • Riptzchen-Website` })
                .setTimestamp();

            await interaction.editReply({ embeds: [setupEmbed] });
        } catch (error) {
            console.error('JSON Fehler:', error);
            await interaction.editReply('❌ Fehler beim Abrufen der Daten.');
        }
    }
    else if (commandName === 'ping') {
        await interaction.reply('Pong! 🏓');
    }
    else if (commandName === 'website') {
        await interaction.reply({ 
            content: 'Hier ist das HQ: https://riptzchen.github.io/riptzchen-website/', 
            flags: MessageFlags.Ephemeral 
        });
    }
});

client.login(process.env.DISCORD_TOKEN);