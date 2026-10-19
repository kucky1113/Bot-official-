const {
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require('discord.js');

const statusChoices = (o) =>
  o
    .setName('status')
    .setDescription('Aktif atau nonaktif')
    .setRequired(true)
    .addChoices({ name: 'On', value: 'on' }, { name: 'Off', value: 'off' });

module.exports = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Cek latensi bot'),

  new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Tampilkan informasi server RKN'),

  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Beri timeout kepada member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('user').setDescription('Member yang di-timeout').setRequired(true))
    .addIntegerOption((o) =>
      o.setName('menit').setDescription('Durasi dalam menit (1-40320)').setRequired(true).setMinValue(1).setMaxValue(40320)
    )
    .addStringOption((o) => o.setName('alasan').setDescription('Alasan timeout')),

  new SlashCommandBuilder()
    .setName('role')
    .setDescription('Tambah atau hapus role member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addStringOption((o) =>
      o
        .setName('aksi')
        .setDescription('Tambah atau hapus')
        .setRequired(true)
        .addChoices({ name: 'Tambah', value: 'add' }, { name: 'Hapus', value: 'remove' })
    )
    .addUserOption((o) => o.setName('user').setDescription('Member target').setRequired(true))
    .addRoleOption((o) => o.setName('role').setDescription('Role yang dikelola').setRequired(true)),

  new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Hapus pesan di channel ini')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((o) =>
      o.setName('jumlah').setDescription('Jumlah pesan (1-100)').setRequired(true).setMinValue(1).setMaxValue(100)
    )
    .addUserOption((o) => o.setName('user').setDescription('Hanya hapus pesan dari user ini')),

  new SlashCommandBuilder()
    .setName('raidmode')
    .setDescription('Aktifkan mode anti-raid')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((o) => statusChoices(o)),

  new SlashCommandBuilder()
    .setName('antilink')
    .setDescription('Blokir link dari member biasa')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((o) => statusChoices(o)),

  new SlashCommandBuilder()
    .setName('blacklist-add')
    .setDescription('Tambah kata ke blacklist')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((o) => o.setName('kata').setDescription('Kata yang dilarang').setRequired(true)),

  new SlashCommandBuilder()
    .setName('blacklist-remove')
    .setDescription('Hapus kata dari blacklist')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((o) => o.setName('kata').setDescription('Kata yang dihapus').setRequired(true)),

  new SlashCommandBuilder()
    .setName('blacklist-list')
    .setDescription('Lihat daftar kata blacklist')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName('announcement')
    .setDescription('Kirim pengumuman resmi')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((o) => o.setName('pesan').setDescription('Isi pengumuman').setRequired(true))
    .addStringOption((o) => o.setName('judul').setDescription('Judul pengumuman'))
    .addChannelOption((o) => o.setName('channel').setDescription('Channel tujuan (default: channel ini)')),

  new SlashCommandBuilder()
    .setName('emblem')
    .setDescription('Tampilkan emblem (icon & banner) server'),

  new SlashCommandBuilder()
    .setName('say')
    .setDescription('Bot mengirim pesan atas nama bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((o) => o.setName('pesan').setDescription('Isi pesan').setRequired(true))
    .addChannelOption((o) => o.setName('channel').setDescription('Channel tujuan (default: channel ini)')),

  new SlashCommandBuilder()
    .setName('antispam')
    .setDescription('Deteksi & hukum member yang spam')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((o) => statusChoices(o)),

  new SlashCommandBuilder()
    .setName('security')
    .setDescription('Tampilkan panel status keamanan server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
].map((c) => c);
