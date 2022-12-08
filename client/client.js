"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _discord = require("discord.js");
class _default extends _discord.Client {
  constructor(config) {
    super({
      intents: [_discord.GatewayIntentBits.Guilds, _discord.GatewayIntentBits.GuildVoiceStates, _discord.GatewayIntentBits.GuildMessages, _discord.GatewayIntentBits.MessageContent]
    });
    this.commands = new _discord.Collection();
    this.config = config;
  }
}
exports.default = _default;
;