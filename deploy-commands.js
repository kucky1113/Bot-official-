require('dotenv').config();
const { REST, Routes } = require('discord.js');
const commands = require('./commands').map((c) => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log(`⏳ Mendaftarkan ${commands.length} command...`);
    // Guild command: muncul instan di server. Ganti ke applicationCommands() untuk global (butuh ~1 jam).
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ Command berhasil didaftarkan.');
  } catch (err) {
    console.error('❌ Gagal mendaftarkan command:', err);
  }
})();
