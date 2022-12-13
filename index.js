const fs = require('fs');
const { Stream } = require('./stream')
const Discord = require('discord.js');
const config = require('./config.json');
const {Player} = require('discord-player');
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const Client = require('./client/Client').default;
const client = new Client();
const { OpusEncoder } = require('@discordjs/opus');


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
  if (msg.content.startsWith(prefix)) {
    content = msg.content.split(" ");
    command = content[0].split(prefix)[1];
    if (process.env.owner_id && !users.includes(msg.author.id) && msg.author.id != process.env.owner_id) return;
    switch (command) 
    {
      case 'p':
        if (stream.in_progress && notAllowed(msg)) {
          msg.reply("Another session is already in progress");
          return;
        }
        const voice_channel = msg.member.voice.channel;
        if (!voice_channel) {
          msg.reply("You need to be in a voice channel to use this command");
          return;
        }
        stream.in_progress = true;
        stream.owner = msg.author.id;
        stream.guild_id = msg.guild.id;
        stream.channel_id = voice_channel.id;
        url = content[content.length - 1];
        if (!url || !url.match(url_regex)) {
          msg.react(reject);
          return;
        }
        !stream.in_loading ? msg.channel.send("Please wait...").then(msg => {
          // not safe...
          if (url.includes('youtube.com') || url.includes('youtu.be')) stream.load(url, true, msg);else stream.load(url, false, msg);
        }) : msg.reply("Another video loading is already in progress, Try again later.");
        break;
      case 'play':
        notAllowed(msg) ? msg.react(reject) : stream.play();
        break;
      case 'pause':
        notAllowed(msg) ? msg.react(reject) : stream.pause();
        break;
      case 'duration':
        stream.duration ? msg.channel.send(stream.hms(stream.duration)) : msg.reply("N/A, try again later");
        break;
      case 'seek':
        if (content[1]) notAllowed(msg) ? msg.react(reject) : stream.current(content[1]);else stream.current().then(result => {
          if (result) msg.channel.send(stream.hms(result));else msg.reply("N/A, try again later");
        });
        break;
      case 'loop':
        if (notAllowed(msg)) msg.react(reject);else {
          if (!loop) {
            loop = true;
            intLoop = setInterval(() => {
              stream.current().then(result => {
                if (result >= stream.duration) stream.driver.executeScript('video.play()');
              });
            }, 100);
            msg.reply("Video loop set");
          } else {
            loop = false;
            clearInterval(intLoop);
            msg.reply("Video loop unset");
          }
        }
        break;
      case 'stop':
        if (notAllowed(msg)) msg.react(reject);else {
          stream.download_process && stream.download_process.kill();
          stream.stop();
          if (stream.in_loading) stream.killed = true;
          stream.in_loading = false;
          stream.in_progress = false;
          msg.react(accept);
        }
        break;
      case 'help':
        msg.channel.send(helpMessage);
        break;
      case 'add':
        id = content[content.length - 1];
        if (!id || msg.author.id != process.env.owner_id) return;
        users.push(id);
        writeFile('users.json', JSON.stringify(users), err => {
          if (err) {
            msg.channel.send(err);
            return;
          }
          msg.reply('User added');
        });
        break;
      case 'remove':
        id = content[content.length - 1];
        if (!id || msg.author.id != process.env.owner_id) return;
        if (!users.includes(id)) {
          msg.reply('User does not exist');
          return;
        }
        users = users.filter(e => e != id);
        writeFile('users.json', JSON.stringify(users), err => {
          if (err) {
            msg.channel.send(err);
            return;
          }
          msg.reply('User removed');
        });
        break;
      case 'list':
        msg.channel.send(users.length !== 0 ? users.join('\n\n') : 'No user available');
        break;
      default:
        msg.reply("Unknown command, type `*help` for list of commands");
    }
    process.env.log_channel_id && client.channels.cache.get(process.env.log_channel_id).send(`Command: ${msg.content}\nSender: ${msg.author.username} | ${msg.author.id}`);
  }

  if (message.author.bot || !message.guild) return;
  if (!client.application?.owner) await client.application?.fetch();

  if (message.content === '!deploy' && message.author.id === client.application?.owner?.id) {
    await message.guild.commands
      .set(client.commands)
      .then(() => {
        message.reply('Deployed!');
      })
      .catch(err => {
        message.reply('Could not deploy commands! Make sure the bot has the application.commands permission!');
        console.error(err);
      });
  }
});

client.on('interactionCreate', async interaction => {
  const command = client.commands.get(interaction.commandName.toLowerCase());

  try {
    if (interaction.commandName == 'ban' || interaction.commandName == 'userinfo') {
      command.execute(interaction, client);
    } else {
      command.execute(interaction, player);
    }
  } catch (error) {
    console.error(error);
    interaction.followUp({
      content: 'There was an error trying to execute that command!',
    });
  }
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

this.After(function(scenario) {

  function getWindowLocation() {
    return window.location;
  }

  function clearStorage() {
    window.sessionStorage.clear();
    window.localStorage.clear();
  }

  return browser.executeScript(getWindowLocation).then(function(location) {
    // NB If no page is loaded in the scneario then calling clearStorage will cause exception
    // so guard against this by checking hostname (If no page loaded then hostname == '')
    if (location.hostname.length > 0) {
      return browser.executeScript(clearStorage);
    }
    else {
      return Promise.resolve();
    }
  });
});

client.login(config.token);