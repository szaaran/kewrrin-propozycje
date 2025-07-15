const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  console.log(`Zalogowano jako ${client.user.tag}`);

  const channelId = process.env.PROPOSAL_CHANNEL_ID;
  const channel = await client.channels.fetch(channelId);

  if (!channel) {
    console.error('Nie znaleziono kanału!');
    process.exit(1);
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('openProposalModal')
      .setLabel('Złóż propozycję')
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({ content: 'Kliknij przycisk, aby złożyć propozycję!', components: [row] });
  console.log('Wysłano wiadomość z przyciskiem.');
  process.exit(0);
});

client.login(process.env.TOKEN);
