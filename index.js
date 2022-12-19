const fs = require('fs');
const { Stream } = require('./stream')
const Discord = require('discord.js');
const config = require('./config.json');
const {Player} = require('discord-player');
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const Client = require('./client/Client').default;
const client = new Client();
const { OpusEncoder } = require('@discordjs/opus');
const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
let intLoop = null
let loop = false
const reject = '❌'
const accept = '✅'
const prefix = '*'
const token = process.env.token
let stream = new Stream(token)
const url_expression = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi;
const url_regex = new RegExp(url_expression)
const CHANNEL_ID = '696077834732437554';

client.commands = new Discord.Collection();

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

console.log(client.commands);
// clearStorage();

const notAllowed = msg => {
  return stream.owner !== msg.author.id &&
      stream.owner !== process.env.owner_id &&
      !msg.member.permissions.has('ADMINISTRATOR')
}

const helpMessage = `Help\n
    *p \`url\` | Youtube | direct link (without downloading)\n
    *play | Play video\n
    *pause | Pause video\n
    *duration | Show video duration\n
    *seek | Show current video time\n
    *seek \`sec, +sec, -sec\` | Change video time\n
    *loop | Toggle playing video on loop\n
    *stop | Stop streaming
`
const player = new Player(client);

player.on('error', (queue, error) => {
  console.log(`[${queue.guild.name}] Error emitted from the queue: ${error.message}`);
});

player.on('connectionError', (queue, error) => {
  console.log(`[${queue.guild.name}] Error emitted from the connection: ${error.message}`);
});

player.on('trackStart', (queue, track) => {
  queue.metadata.send(`▶ | Started playing: **${track.title}** in **${queue.connection.channel.name}**!`);
});

player.on('trackAdd', (queue, track) => {
  queue.metadata.send(`🎶 | Track **${track.title}** queued!`);
});

player.on('botDisconnect', queue => {
  queue.metadata.send('❌ | I was manually disconnected from the voice channel, clearing queue!');
});

player.on('channelEmpty', queue => {
  queue.metadata.send('❌ | Nobody is in the voice channel, leaving...');
});

player.on('queueEnd', queue => {
  queue.metadata.send('✅ | Queue finished!');
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);

  // Join the specified channel
  const channel = client.channels.cache.get(CHANNEL_ID);
  if (!channel) {
    console.error(`Could not find channel with ID ${CHANNEL_ID}`);
    return;
  }
  channel.join();
});

client.on('message', (message) => {
  // Reset the inactivity timer whenever there is a message in the channel
  resetInactivityTimer();
});

client.once('reconnecting', () => {
  console.log('Reconnecting!');
});

client.once('disconnect', () => {
  console.log('Disconnect!');
});

client.on('messageCreate', async message => {
  
});

client.on('interactionCreate', async interaction => {
  // const command = client.commands.get(interaction.commandName.toLowerCase());

  // try {
  //   if (interaction.commandName == 'ban' || interaction.commandName == 'userinfo') {
  //     command.execute(interaction, client);
  //   } else {
  //     command.execute(interaction, player);
  //   }
  // } catch (error) {
  //   console.error(error);
  //   interaction.followUp({
  //     content: 'There was an error trying to execute that command!',
  //   });
  // }
});

let inactivityTimer;

function resetInactivityTimer() {
  // Clear any existing timer
  clearTimeout(inactivityTimer);

  // Set a new timer that will leave the channel after 5 minutes of inactivity
  inactivityTimer = setTimeout(() => {
    const channel = client.channels.cache.get(CHANNEL_ID);
    if (channel) {
      channel.leave();
    }
  }, 5 * 60 * 1000);
}

client.login(config.token);
