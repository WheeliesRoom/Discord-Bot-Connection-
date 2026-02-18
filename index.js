client.on("messageCreate", async (message) => {
  try {
    // Ignore bot messages
    if (message.author.bot) return;

    const content = message.content.trim();

    // Only proceed if the message is purely a number (the quantity)
    if (!/^\d+$/.test(content)) return;

    let repliedToData = null;

    // Check if the manager replied to a message
    if (message.reference && message.reference.messageId) {
      try {
        // Fetch the message that was replied to
        repliedToData = await message.channel.messages.fetch(message.reference.messageId);
      } catch (e) {
        console.error("Could not fetch referenced message:", e.message);
      }
    }

    // Send the data to n8n Workflow 2
    await axios.post(N8N_WEBHOOK_URL, {
      quantity: content,
      replied_to_content: repliedToData ? repliedToData.content : null,
      author: message.author.username,
      message_id: message.id
    });
    
    console.log(`Sent quantity ${content} and reference data to n8n`);

  } catch (error) {
    console.error("Error sending to n8n:", error.message);
  }
});
