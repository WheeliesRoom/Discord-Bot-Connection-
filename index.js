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

        // ✅ NEW: Allow integer + float values
        const num = parseFloat(content);
        if (isNaN(num)) {
            console.log("Invalid input (not a number):", content);
            return;
        }

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

        // 4. Send the combined data to n8n Workflow
        await axios.post(N8N_WEBHOOK_URL, {
            quantity: content, // send as-is, n8n will round it
            replied_to_content: repliedToContent,
            author: message.author.username,
            raw: message
        });

        console.log(`Sent quantity ${content} to n8n`);

    } catch (error) {
        console.error("Error sending to n8n:", error.message);
    }
});

client.login(DISCORD_BOT_TOKEN);