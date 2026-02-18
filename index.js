require('dotenv').config(); // Loads DISCORD_BOT_TOKEN and N8N_WEBHOOK_URL from .env
const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 10000;

// Express server to keep the bot alive on Digital Ocean
app.get("/", (req, res) => {
    res.send("Bot is running");
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once("ready", () => {
    console.log(`Bot logged in as ${client.user.tag}`);
});

client.on("messageCreate", async(message) => {
    try {
        // 1. Ignore messages from bots
        if (message.author.bot) return;

        const content = message.content.trim();

        // 2. Only proceed if the message is purely a number (the quantity)
        if (!/^\d+$/.test(content)) return;

        let repliedToContent = null;

        // 3. Logic to fetch the message being replied to
        if (message.reference && message.reference.messageId) {
            try {
                const repliedToMessage = await message.channel.messages.fetch(message.reference.messageId);
                repliedToContent = repliedToMessage.content;
            } catch (fetchError) {
                console.error("Could not fetch the replied-to message:", fetchError.message);
            }
        }

        // 4. Send the combined data to n8n Workflow 2
        await axios.post(N8N_WEBHOOK_URL, {
            quantity: content, // The number the manager typed
            replied_to_content: repliedToContent, // The bot's question (contains STOCKTAKE:ID)
            author: message.author.username, // Who sent the reply
            raw: message // The full message object for backup
        });

        console.log(`Sent quantity ${content} and reference text to n8n`);

    } catch (error) {
        console.error("Error sending to n8n:", error.message);
    }
});

client.login(DISCORD_BOT_TOKEN);