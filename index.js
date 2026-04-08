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
        if (message.author.bot) return;

        const content = message.content.trim();

        // ✅ Allow int + float
        const num = parseFloat(content);
        if (isNaN(num)) {
            console.log("Invalid input:", content);
            return;
        }

        let repliedToContent = null;

        // ✅ PRIORITY 1: If user replied properly
        if (message.reference && message.reference.messageId) {
            try {
                const repliedToMessage = await message.channel.messages.fetch(message.reference.messageId);
                repliedToContent = repliedToMessage.content;
                console.log("✅ Got reply reference");
            } catch (err) {
                console.log("⚠️ Failed to fetch reply:", err.message);
            }
        }

        // ✅ PRIORITY 2: Fallback → get last bot message
        if (!repliedToContent) {
            try {
                const messages = await message.channel.messages.fetch({ limit: 5 });

                const lastBotMessage = messages.find(msg => msg.author.bot);

                if (lastBotMessage) {
                    repliedToContent = lastBotMessage.content;
                    console.log("✅ Fallback: using last bot message");
                } else {
                    console.log("❌ No bot message found in history");
                }
            } catch (err) {
                console.log("❌ Error fetching history:", err.message);
            }
        }

        // 🚨 FINAL SAFETY
        if (!repliedToContent) {
            console.log("❌ No context found, skipping");
            return;
        }

        // 🔥 Send to n8n
        await axios.post(N8N_WEBHOOK_URL, {
            quantity: content,
            replied_to_content: repliedToContent,
            author: message.author.username,
            raw: message
        });

        console.log(`✅ Sent quantity ${content} with context`);

    } catch (error) {
        console.error("❌ Error:", error.message);
    }
});

client.login(DISCORD_BOT_TOKEN);