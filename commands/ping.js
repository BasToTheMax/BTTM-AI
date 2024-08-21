const { SlashCommand } = require('slashctrl');

class CMD extends SlashCommand {

    constructor() {
        super();
        
        this.setName("ping");
        this.setDescription("Check if the bot is online");
    }
    
    async execute(interaction) {
        interaction.reply('**Pong** :coin: :D')
    }

}

module.exports = { default: CMD };