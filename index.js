require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client,
  Events,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
  GuildVerificationLevel,
} = require('discord.js');

// ---------- Konfigurasi ----------
const COLOR = 0xce1126; // merah bendera Indonesia
const EPH = { flags: MessageFlags.Ephemeral };
const FOOTER = { text: 'RKN || REPUBLIC OF INDONESIA' };
const DB_FILE = path.join(__dirname, 'data', 'db.json');
const LINK_REGEX = /(https?:\/\/|www\.|discord\.gg\/)\S+/i;
const SPAM_LIMIT = 5;          // maks pesan...
const SPAM_WINDOW = 5000;      // ...dalam 5 detik
const SPAM_TIMEOUT = 5 * 60_000;

// ---------- Database JSON sederhana ----------
function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return {};
  }
}
function saveDB() {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}
const db = loadDB();
function cfg(guildId) {
  if (!db[guildId]) {
    db[guildId] = { antilink: false, antispam: false, raidmode: false, blacklist: [] };
  }
  return db[guildId];
}

const spamMap = new Map();

// ---------- Helper ----------
const embed = (title, description) =>
  new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(title)
    .setDescription(description)
    .setFooter(FOOTER)
    .setTimestamp();

async function warn(message, text) {
  const m = await message.channel.send(`⚠️ ${message.author}, ${text}`).catch(() => null);
  if (m) setTimeout(() => m.delete().catch(() => {}), 5000);
}

// ---------- Client ----------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Bot online sebagai ${c.user.tag}`);
});

// ---------- Anti-raid: kick member baru saat raid mode aktif ----------
client.on(Events.GuildMemberAdd, async (member) => {
  if (!cfg(member.guild.id).raidmode) return;
  await member.kick('Raid mode aktif').catch(() => {});
});

// ---------- Moderasi pesan: blacklist, antilink, antispam ----------
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild || !message.member) return;

  // Staff (ManageMessages) kebal dari filter
  if (message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;

  const c = cfg(message.guild.id);
  const content = message.content;

  // Blacklist kata
  const lower = content.toLowerCase();
  if (c.blacklist.some((w) => lower.includes(w))) {
    await message.delete().catch(() => {});
    return warn(message, 'pesan mengandung kata yang dilarang.');
  }

  // Antilink
  if (c.antilink && LINK_REGEX.test(content)) {
    await message.delete().catch(() => {});
    return warn(message, 'link tidak diizinkan di server ini.');
  }

  // Antispam
  if (c.antispam) {
    const key = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    const times = (spamMap.get(key) ?? []).filter((t) => now - t < SPAM_WINDOW);
    times.push(now);
    spamMap.set(key, times);

    if (times.length > SPAM_LIMIT) {
      spamMap.delete(key);
      await message.delete().catch(() => {});
      if (message.member.moderatable) {
        await message.member.timeout(SPAM_TIMEOUT, 'Anti-spam').catch(() => {});
      }
      warn(message, 'spam terdeteksi. Kamu di-timeout selama 5 menit.');
    }
  }
});

// ---------- Slash commands ----------
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (!interaction.inGuild()) {
    return interaction.reply({ content: 'Command ini hanya bisa dipakai di server.', ...EPH });
  }

  const { commandName, options, guild, member, user, channel } = interaction;
  const c = cfg(guild.id);

  const reply = (opts) => interaction.reply(opts);
  const ok = (text) => interaction.reply({ content: `✅ ${text}`, ...EPH });
  const fail = (text) => interaction.reply({ content: `❌ ${text}`, ...EPH });

  // Owner selalu boleh; selain itu harus punya role lebih tinggi dari target
  const outranks = (target) =>
    guild.ownerId === user.id || member.roles.highest.position > target.roles.highest.position;

  try {
    switch (commandName) {
      // /ping
      case 'ping': {
        return reply({
          embeds: [embed('🏓 Pong!', `Latensi WebSocket: **${client.ws.ping} ms**`)],
        });
      }

      // /serverinfo
      case 'serverinfo': {
        const e = embed(`📜 ${guild.name}`, guild.description ?? 'Server resmi RKN || REPUBLIC OF INDONESIA').addFields(
          { name: '🆔 ID', value: guild.id, inline: true },
          { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
          { name: '👥 Member', value: `${guild.memberCount}`, inline: true },
          { name: '💬 Channel', value: `${guild.channels.cache.size}`, inline: true },
          { name: '🏷️ Role', value: `${guild.roles.cache.size}`, inline: true },
          { name: '🚀 Boost', value: `Level ${guild.premiumTier} • ${guild.premiumSubscriptionCount ?? 0} boost`, inline: true },
          { name: '📅 Dibuat', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true }
        );
        const icon = guild.iconURL({ size: 256 });
        if (icon) e.setThumbnail(icon);
        return reply({ embeds: [e] });
      }

      // /timeout
      case 'timeout': {
        const target = options.getMember('user');
        const menit = options.getInteger('menit', true);
        const alasan = options.getString('alasan') ?? 'Tidak ada alasan';

        if (!target) return fail('Member tidak ditemukan di server.');
        if (target.id === user.id) return fail('Kamu tidak bisa men-timeout diri sendiri.');
        if (!outranks(target)) return fail('Role kamu tidak cukup tinggi untuk member ini.');
        if (!target.moderatable) return fail('Bot tidak bisa men-timeout member ini.');

        await target.timeout(menit * 60_000, `${alasan} | oleh ${user.username}`);
        return reply({
          embeds: [
            embed('⏳ Member di-timeout', `${target} selama **${menit} menit**\n📝 Alasan: ${alasan}`),
          ],
        });
      }

      // /role
      case 'role': {
        const aksi = options.getString('aksi', true);
        const target = options.getMember('user');
        const role = options.getRole('role', true);

        if (!target) return fail('Member tidak ditemukan.');
        if (role.managed || role.id === guild.id) return fail('Role ini tidak bisa dikelola.');
        if (role.position >= guild.members.me.roles.highest.position) {
          return fail('Role itu setara atau lebih tinggi dari role bot.');
        }
        if (guild.ownerId !== user.id && member.roles.highest.position <= role.position) {
          return fail('Role itu setara atau lebih tinggi dari role kamu.');
        }

        if (aksi === 'add') await target.roles.add(role);
        else await target.roles.remove(role);

        return ok(
          `Role ${role} ${aksi === 'add' ? 'ditambahkan ke' : 'dihapus dari'} ${target}.`
        );
      }

      // /purge
      case 'purge': {
        const jumlah = options.getInteger('jumlah', true);
        const target = options.getUser('user');

        await interaction.deferReply(EPH);

        const fetched = await channel.messages.fetch({ limit: 100 });
        const filtered = target ? fetched.filter((m) => m.author.id === target.id) : fetched;
        const batas = Date.now() - 14 * 24 * 60 * 60 * 1000; // Discord hanya bisa hapus < 14 hari
        const pesan = [...filtered.values()].filter((m) => m.createdTimestamp > batas).slice(0, jumlah);

        if (pesan.length === 0) {
          return interaction.editReply({ content: '❌ Tidak ada pesan yang bisa dihapus.' });
        }

        const hapus = await channel.bulkDelete(pesan, true);
        return interaction.editReply({ content: `🧹 Berhasil menghapus **${hapus.size}** pesan.` });
      }

      // /raidmode
      case 'raidmode': {
        const aktif = options.getString('status', true) === 'on';
        c.raidmode = aktif;
        saveDB();

        // Perketat verifikasi saat aktif; kembali ke Medium saat nonaktif
        await guild
          .edit({
            verificationLevel: aktif ? GuildVerificationLevel.High : GuildVerificationLevel.Medium,
          })
          .catch(() => {});

        return reply({
          embeds: [
            embed(
              '🛡️ Raid Mode',
              aktif
                ? '🔴 **AKTIF** — member baru otomatis dikeluarkan dan verifikasi diperketat.'
                : '🟢 **NONAKTIF** — server kembali normal.'
            ),
          ],
        });
      }

      // /antilink & /antispam
      case 'antilink':
      case 'antispam': {
        const aktif = options.getString('status', true) === 'on';
        c[commandName] = aktif;
        saveDB();
        const nama = commandName === 'antilink' ? 'Anti-Link' : 'Anti-Spam';
        return reply({
          embeds: [embed(`${aktif ? '🟢' : '🔴'} ${nama}`, `Status: **${aktif ? 'AKTIF' : 'NONAKTIF'}**`)],
        });
      }

      // /blacklist-add
      case 'blacklist-add': {
        const kata = options.getString('kata', true).trim().toLowerCase();
        if (c.blacklist.includes(kata)) return fail(`\`${kata}\` sudah ada di blacklist.`);
        c.blacklist.push(kata);
        saveDB();
        return ok(`\`${kata}\` ditambahkan ke blacklist.`);
      }

      // /blacklist-remove
      case 'blacklist-remove': {
        const kata = options.getString('kata', true).trim().toLowerCase();
        const idx = c.blacklist.indexOf(kata);
        if (idx === -1) return fail(`\`${kata}\` tidak ada di blacklist.`);
        c.blacklist.splice(idx, 1);
        saveDB();
        return ok(`\`${kata}\` dihapus dari blacklist.`);
      }

      // /blacklist-list
      case 'blacklist-list': {
        if (!c.blacklist.length) {
          return reply({ embeds: [embed('🚫 Blacklist', 'Blacklist masih kosong.')], ...EPH });
        }
        const daftar = c.blacklist.map((w, i) => `${i + 1}. \`${w}\``).join('\n');
        return reply({ embeds: [embed(`🚫 Blacklist (${c.blacklist.length})`, daftar)], ...EPH });
      }

      // /announcement
      case 'announcement': {
        const judul = options.getString('judul') ?? '📢 Pengumuman';
        const isi = options.getString('pesan', true);
        const target = options.getChannel('channel') ?? channel;

        if (!target.isTextBased()) return fail('Channel tujuan harus berupa text channel.');

        await target.send({
          embeds: [
            embed(judul, isi).setAuthor({ name: user.username, iconURL: user.displayAvatarURL() }),
          ],
        });
        return ok(`Pengumuman terkirim ke ${target}.`);
      }

      // /emblem
      case 'emblem': {
        const icon = guild.iconURL({ size: 512 });
        if (!icon) return fail('Server ini belum memiliki icon/emblem.');

        const e = embed(`🇮🇩 Emblem ${guild.name}`, 'Lambang resmi server **RKN || REPUBLIC OF INDONESIA**').setThumbnail(icon);
        const banner = guild.bannerURL({ size: 1024 });
        if (banner) e.setImage(banner);
        return reply({ embeds: [e] });
      }

      // /say
      case 'say': {
        const pesan = options.getString('pesan', true);
        const target = options.getChannel('channel') ?? channel;

        if (!target.isTextBased()) return fail('Channel tujuan harus berupa text channel.');

        await target.send({ content: pesan, allowedMentions: { parse: [] } });
        return ok(`Pesan terkirim ke ${target}.`);
      }

      // /security
      case 'security': {
        const levels = ['Tidak ada', 'Rendah', 'Sedang', 'Tinggi', 'Sangat tinggi'];
        const onOff = (v) => (v ? '🟢 Aktif' : '🔴 Nonaktif');

        const e = embed('🔐 Security Panel', `Ringkasan keamanan **${guild.name}**`).addFields(
          { name: '🔗 Anti-Link', value: onOff(c.antilink), inline: true },
          { name: '🌊 Anti-Spam', value: onOff(c.antispam), inline: true },
          { name: '🛡️ Raid Mode', value: onOff(c.raidmode), inline: true },
          { name: '🚫 Blacklist', value: `${c.blacklist.length} kata`, inline: true },
          { name: '✅ Verifikasi', value: levels[guild.verificationLevel] ?? 'Tidak diketahui', inline: true },
          { name: '🔑 2FA Admin', value: guild.mfaLevel === 1 ? '🟢 Wajib' : '🔴 Tidak wajib', inline: true }
        );
        return reply({ embeds: [e], ...EPH });
      }

      default:
        return fail('Command tidak dikenal.');
    }
  } catch (err) {
    console.error(err);
    const payload = { content: '❌ Terjadi kesalahan saat menjalankan command.' };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload).catch(() => {});
    } else {
      await interaction.reply({ ...payload, ...EPH }).catch(() => {});
    }
  }
});

client.login(process.env.TOKEN);
