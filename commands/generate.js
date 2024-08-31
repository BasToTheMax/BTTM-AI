const { SlashCommand } = require('slashctrl');

class CMD extends SlashCommand {

    constructor() {
        super();
        
        this.setName("prompt");
        this.setDescription("Generate an AI image");

        this.addStringOption(option =>
            option.setName('prompt')
                .setDescription('Image prompt')
				.setRequired(true));
    }
    
    async execute(interaction) {
        if (!interaction.channel) {
            return interaction.reply('This command does not support DM, sorry.');
        }
        var prompt = interaction.options.getString('prompt');
        // const db = require('../db');

        while (String(prompt).includes('@')) {
            prompt = String(prompt).replace('@', '');
        }
        
        await interaction.deferReply();

        var queue = interaction.client.imageQueue;

        await interaction.editReply('Adding to queue...');

        var pos = await queue.getJobCounts('wait');

        var job = await queue.add(`img-${interaction.user.id}-${Date.now()}`, {
            userID: interaction.user.id,
            prompt,
            channelID: interaction.channel.id
        }, {
            attempts: 5,
            backoff: {
		      type: 'exponential',
		      delay: 1000*60*15,
		},
        });//1000*60*15*attempts

        interaction.editReply(`**QUEUED**\nYour image has been prompt has been placed in the queue.\nJOB ID: ${job.id}\nPosition: ${pos.wait+1}`);
    }

}

module.exports = { default: CMD };
