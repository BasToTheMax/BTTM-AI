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
    const events = new BullMQ.QueueEvents('images', queueOptions);

    events.on('waiting', ({ jobId }) => {
        console.log(`[Images] A job with ID ${jobId} is waiting`);
    });

    events.on('active', ({ jobId, prev }) => {
        console.log(`[Images] Job ${jobId} is now active; previous status was ${prev}`);
    });


    events.on('completed', async ({ jobId, returnvalue }) => {
        console.log(`[Images] ${jobId} has completed and returned ${returnvalue}`, returnvalue);

        var job = await q.getJob(jobId);
        var data = job.data;

        console.log('in', data);
    });

    events.on('progress', async ({ jobId, returnvalue, mau }) => {
        // console.log(`[${name}] ${jobId} has progress and returned ${returnvalue}`, returnvalue, mau);
        console.log('> ' + (await q.getJob(jobId)).progress);
    });

    events.on('failed', async ({ jobId, failedReason }) => {
        console.log(`[Images] ${jobId} has failed with reason ${failedReason}`);

        var job = await q.getJob(jobId);
        var data = job.data;

        messageUser(data.userID, '> Image failed to generate :(')

    });

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

function messageUser(userID, message) {
    try {
        client.users.send(userID, message);
    } catch (e) {
        console.log('failed to dm user', e)
    }
}
