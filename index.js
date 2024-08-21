require('dotenv').config();

const { SlashCtrl } = require('slashctrl');
const path = require('path');
const dayjs = require('dayjs');
const { log } = console;

var relativeTime = require('dayjs/plugin/relativeTime')
dayjs.extend(relativeTime);

var botToken = process.env.DISCORD_TOKEN;
var applicationId = process.env.DISCORD_ID;

const slashCtrl = new SlashCtrl({
    token: botToken,
    applicationId: applicationId
});

var e = slashCtrl.publishCommandsFromFolder(path.join(__dirname, 'commands'));

const db = require('./db');

const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const BullMQ = require('bullmq');

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    var queueOptions = {
        connection: {
            host: process.env.REDIS_HOST,
            username: process.env.REDIS_USERNAME,
            password: process.env.REDIS_PASSWORD,
            port: process.env.REDIS_PORT,
            retryStrategy(times) {
                return 1000;
            },
        }
    };

    client.imageQueue = new BullMQ.Queue('images', queueOptions);

    updateStatus();
    setInterval(updateStatus, 5 * 60 * 1000)
});

async function updateStatus() {
    var count = await db.Image.countDocuments();
    client.user.setActivity(`with ${count} images`);
}

client.on('interactionCreate', async interaction => {
    console.log(`> ${interaction.user.username} -> /${interaction.commandName}`);

    interaction.log = client.channels.cache.get(process.env.CH_LOG);
    
    slashCtrl.handleCommands(interaction);
});


client.login(botToken);

function createEvents(name, queueOptions, q, code) {
    const events = new BullMQ.QueueEvents(name, queueOptions);

    client.createQueue[code].events = events;

    events.on('waiting', ({ jobId }) => {
        // console.log(`[${name}] A job with ID ${jobId} is waiting`);
    });

    events.on('active', ({ jobId, prev }) => {
        // console.log(`[${name}] Job ${jobId} is now active; previous status was ${prev}`);
    });

    events.on('completed', async ({ jobId, returnvalue }) => {
        console.log(`[${name}] ${jobId} has completed and returned ${returnvalue}`, returnvalue);

        var job = await q.getJob(jobId);
        var data = job.data;

        if (returnvalue.ok == true) {
            try {
                var userID = data.userID;

                var db = require('./db');
                var VPS = await db.VPS.findOne({
                    _id: returnvalue.vpsID
                });
                if (!VPS) return console.log('VPS NOT FOUND?!!?!?111');
                VPS.proxID = returnvalue.proxID;
                VPS.state = 'created';
                VPS.expiry = dayjs().add(3, 'day');
                await VPS.save();

                var conn = '';

                conn += '```bash\n';
                conn += `ssh root@${VPS.nodeIP} -p ${VPS.sshPort}`
                conn += '\n```';

                client.users.send(userID, `> **VPS Created!**\n> \t\tHello. Your vps has been created!\n> This message will contain the details of your vps.\n\n> VPS ID: \`${VPS.shortID}\`\n> VPS IP (NAT/shared): ${VPS.nodeIP}\n> SSH Port: ${VPS.sshPort}\n> Username: root\n> Password: ||\`${VPS.password}\`||\n\n> Connect to your vps by executing this in a terminal:\n${conn}\n\nIf you want to forward a port, use the /forward command.`);

            } catch (e) {
                console.log(`> Failed to send ${data.userID} a DM: ${String(e)}`);
            }
        } else {
            try {
                var userID = data.userID;
                console.log('r', returnvalue)
                client.users.send(userID, `> **Create failed :x:!**\n> \t\tHello. Your vps has failed to create :(`);
            } catch (e) { }
        }
    });

    events.on('progress', async ({ jobId, returnvalue, mau }) => {
        // console.log(`[${name}] ${jobId} has progress and returned ${returnvalue}`, returnvalue, mau);
        console.log('> ' + (await q.getJob(jobId)).progress);
    });

    events.on('failed', async ({ jobId, failedReason }) => {
        console.log(`[${name}] ${jobId} has failed with reason ${failedReason}`);

        var job = await q.getJob(jobId);
        var data = job.data;

        try {
            client.users.send(data.userID, `> VPS Failed to create :(`);
        } catch (e) {
            console.log(`> Failed to send ${data.userID} a DM: ${String(e)}`);
        }
    });


}

function messageUser(userID, message) {
    try {
        client.users.send(userID, message);
    } catch (e) {
        console.log('failed to dm user', e)
    }
}
