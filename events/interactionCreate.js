const {
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const Proposal = require('../models/Proposal');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {

    if (interaction.isButton()) {
      if (interaction.customId === 'openProposalModal') {
        const modal = new ModalBuilder()
          .setCustomId('proposalModal')
          .setTitle('Złóż propozycję');

        const input = new TextInputBuilder()
          .setCustomId('proposalInput')
          .setLabel('Twoja propozycja')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        const row = new ActionRowBuilder().addComponents(input);
        modal.addComponents(row);

        await interaction.showModal(modal);
      }

      if (interaction.customId.startsWith('proposal_')) {
        if (!interaction.member.roles.cache.has(process.env.MOD_ROLE_ID)) {
          return interaction.reply({ content: 'Nie masz uprawnień do tej akcji!', ephemeral: true });
        }

        const [_, action, messageId] = interaction.customId.split('_');
        const accepted = action === 'accept';

        const proposalChannel = interaction.client.channels.cache.get(process.env.PROPOSAL_CHANNEL_ID);
        const logChannel = interaction.client.channels.cache.get(process.env.PROPOSAL_LOG_CHANNEL_ID);

        if (!proposalChannel || !logChannel) {
          return interaction.reply({ content: 'Kanał propozycji lub logów nie jest poprawnie ustawiony.', ephemeral: true });
        }

        const proposalMsg = await proposalChannel.messages.fetch(messageId).catch(() => null);
        if (!proposalMsg) {
          return interaction.reply({ content: 'Nie mogę znaleźć wiadomości z tą propozycją.', ephemeral: true });
        }

        const proposalDB = await Proposal.findOne({ messageId });
        if (!proposalDB) {
          return interaction.reply({ content: 'Propozycja nie jest w bazie danych.', ephemeral: true });
        }

        if (proposalDB.status !== 'pending') {
          return interaction.reply({ content: 'Ta propozycja została już rozpatrzona.', ephemeral: true });
        }

        proposalDB.status = accepted ? 'accepted' : 'rejected';
        await proposalDB.save();

        const embed = EmbedBuilder.from(proposalMsg.embeds[0])
          .setColor(accepted ? 'Green' : 'Red')
          .setFooter({ text: `Status: ${accepted ? 'Zaakceptowana ✅' : 'Odrzucona ❌'}` });

        await proposalMsg.edit({ embeds: [embed], components: [] });

        await interaction.reply({ content: `Propozycja została ${accepted ? 'Zaakceptowana ( <:checkmark:1394345238142914581>)' : 'Odrzucona ( <:cross:1394345948909670583>)'}.`, ephemeral: true });

        const author = await interaction.client.users.fetch(proposalDB.authorId).catch(() => null);
        if (author) {
          author.send({
            embeds: [
              new EmbedBuilder()
                .setTitle('Twoja propozycja została rozpatrzona')
                .setDescription(`Twoja propozycja:\n> ${proposalDB.content}\n\nStatus: **${accepted ? 'Zaakceptowana <:checkmark:1394345238142914581>' : 'Odrzucona <:cross:1394345948909670583>'}**`)
                .setColor(accepted ? 'Green' : 'Red')
                .setTimestamp(),
            ],
          }).catch(() => null);
        }

        await logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle(`<:improvement:1394346525932392578> Propozycja ${accepted ? 'zaakceptowana' : 'odrzucona'}`)
              .addFields(
                { name: 'Autor', value: proposalDB.authorTag, inline: true },
                { name: 'Moderator', value: interaction.user.tag, inline: true },
                { name: 'Treść', value: proposalDB.content },
              )
              .setColor(accepted ? 'Green' : 'Red')
              .setTimestamp(),
          ],
        });
      }
    }


    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'proposalModal') {
        const proposal = interaction.fields.getTextInputValue('proposalInput');

        await interaction.reply({ content: `Propozycja odebrana: "${proposal}"`, ephemeral: true });

        const proposalChannel = interaction.client.channels.cache.get(process.env.PROPOSAL_CHANNEL_ID);
        if (!proposalChannel) {
          return interaction.followUp({ content: 'Kanał propozycji nie jest poprawnie ustawiony!', ephemeral: true });
        }
 

        const embed = new EmbedBuilder()
          .setColor('#1a1a1e')
          .setTitle('<:technique1:1394263715054096394>  Nowa propozycja!')
          .setDescription(proposal)
          .addFields(
            { name: '<:loading1:1394263744737185893>  Status', value: 'Oczekuje na rozpatrzenie', inline: true },
            { name: '<:faceid1:1394263712931647498>  ID autora', value: interaction.user.id, inline: true },
            { name: '<:administrator1:1394263716664442996>  Instrukcja dla moderatora', value: '```Kliknij Akceptuj lub Odrzuć, aby rozpatrzyć propozycję.```' }
          )
          .setFooter({ text: `Od: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
          .setTimestamp()
          .setThumbnail(interaction.user.displayAvatarURL())
          .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('temp_accept')
            .setLabel('Akceptuj')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true),

          new ButtonBuilder()
            .setCustomId('temp_reject')
            .setLabel('Odrzuć')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true)
        );

     
        const message = await proposalChannel.send({ embeds: [embed], components: [buttons] });


        await message.react('<:1282736693501235272:1394233220949741578>');
        await message.react('<:1282736675289698470:1394233204260732961>');


        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`proposal_accept_${message.id}`)
            .setLabel('Akceptuj')
            .setStyle(ButtonStyle.Success),

          new ButtonBuilder()
            .setCustomId(`proposal_reject_${message.id}`)
            .setLabel('Odrzuć')
            .setStyle(ButtonStyle.Danger),
        );

        await message.edit({ components: [row] });

        const newProposal = new Proposal({
          authorId: interaction.user.id,
          authorTag: interaction.user.tag,
          content: proposal,
          messageId: message.id,
          status: 'pending',
        });

        await newProposal.save();
      }
    }
  },
};
