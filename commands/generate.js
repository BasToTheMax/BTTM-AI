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
        var prompt = interaction.options.getString('prompt');
        // const db = require('../db');
        
        await interaction.deferReply();

        var queue = interaction.client.imageQueue;

        await interaction.editReply('Adding to queue...');

        var job = await queue.add(`img-${interaction.user.id}-${Date.now()}`, {
            userID: interaction.user.id,
            prompt
        });

        var pos = await queue.getJobCounts('wait');
        console.log(pos);
        interaction.editReply(`**QUEUED**\nYour image has been prompt has been placed in the queue.\nJOB ID: ${job.id}\nPosition: 0`);
    }

}

module.exports = { default: CMD };