require('dotenv').config();

const { SlashCtrl } = require('slashctrl');
const path = require('path');
const dayjs = require('dayjs');
const { log } = console;

var relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime);

const {Downloader} = require("nodejs-file-downloader");
const sharp = require('sharp');

const fs = require('fs');

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
        console.log(`[Images] ${jobId} ${prev} -> active`);
    });


    events.on('completed', async ({ jobId, returnvalue }) => {
        console.log(`[Images] ${jobId} -> completed`, returnvalue);

        const downloader = new Downloader({
            url: returnvalue.res.url, //If the file name already exists, a new file with the name 200MB1.zip is created.
            directory: "./img", //This folder will be created, if it doesn't exist.   
            fileName: jobId + '.webp'
        });

        const { filePath } = await downloader.download();

        await sharp(filePath).toFile(`./img/${jobId}.png`);

        fs.rmSync(filePath);

        var token = Date.now();
        token = String(token);

        var img = new db.Image({
            userID: returnvalue.job.userID,
            prompt: returnvalue.job.prompt,
            token
        });
        await img.save();

        fs.renameSync(`./img/${jobId}.png`, `./img/${img._id}.png`);

        var url = `http://n1.meegie.net:3104/img/${token}/${img._id}`;
        var msg = ` Image ${jobId}-${img._id} (\`${img.prompt}\`) completed! ${url}`;

        var channelID = returnvalue.job.channelID;
        try {
            const channel = client.channels.cache.get(channelID);
            if (channel) {
                channel.send(`<@${returnvalue.job.userID}> ${msg}`);
            } else {
                messageUser(returnvalue.job.userID, msg);
            }
        } catch(e) {
            console.log('Failed to post in channel!', e)
        }
    });

    events.on('progress', async ({ jobId, returnvalue, mau }) => {
        // console.log(`[${name}] ${jobId} has progress and returned ${returnvalue}`, returnvalue, mau);
        console.log('> ' + (await client.imageQueue.getJob(jobId)).progress, returnvalue);
    });

    events.on('failed', async ({ jobId, failedReason }) => {
        console.log(`[Images] ${jobId} has failed with reason ${failedReason}`);

        var job = await client.imageQueue.getJob(jobId);
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


const express = require('express');
const app = express();

app.set('view engine', 'ejs');

// app.use('/img', express.static(__dirname + '/img'));
app.get('/img/:token/:id', async (req, res) => {
    var { id, token } = req.params;
    
    var item = await db.Image.findOne({
        _id: id
    });
    if (!item) return res.status(404).send('Image not found');

    if (token != item.token && item.token) {
        return res.status(401).send('Invalid token');
    }

    return res.sendFile(__dirname + '/img/' + id + '.png');
})
app.get('/', (req, res) => {
    res.render('index');
});

app.listen(process.env.PORT);