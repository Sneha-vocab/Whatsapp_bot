
# ✅ Steps to Run the WhatsApp Bot (Node.js + Meta API + ClickHouse)

---

## 📁 1. Project Setup

Ensure your project folder is structured like this:

```
AUTOSHERPA_WHATSAPP_FINAL/
├── app.js
├── db/
├── utils/
├── import/
├── .env
├── package.json
├── README.md
├── WHATSAPP_SETUP.md
└── RUN_BOT.md (this file)
```

---

## ⚙️ 2. Prerequisites

- Node.js (v16 or later)
- WhatsApp Business API access from Meta
- `.env` file properly configured
- ClickHouse server running
- A valid Meta access token
- [Ngrok](https://ngrok.com/) installed for webhook tunneling

---

## 🔐 3. Setup the `.env` File

Example `.env`:

```dotenv
WHATSAPP_API_TOKEN=your_meta_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
GEMINI_API_KEY=your_gemini_api_key
CLICKHOUSE_HOST=localhost
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=
CLICKHOUSE_DATABASE=autosherpa
```

---

## 📦 4. Install Dependencies

In your project root:

```bash
npm install
```

---

## 🚀 5. Start the WhatsApp Bot

```bash
node app.js
```

Leave this terminal running. The server will be listening on port 3000.

---

## 🌐 6. Expose Localhost with Ngrok

In a **new terminal**, run:

```bash
ngrok http 3000
```

Ngrok will provide a forwarding URL like:

```
Forwarding https://fb10fdc5dcfd.ngrok-free.app -> http://localhost:3000
```

Copy the `https://...` URL — this is your webhook base URL.

---

## 🔗 7. Set Webhook in Meta App

1. Go to [Meta Developer Console](https://developers.facebook.com)
2. Open your App > WhatsApp > Configuration
3. Set the following:
   - **Callback URL**: `https://<ngrok-url>/webhook`
   - **Verify Token**: same as what your code expects

> ⚠️ Note: Ngrok free plan uses temporary URLs. If Ngrok restarts, you must update the Meta webhook again.

---

## 📬 8. Test Your Bot

Use your verified phone number to send messages to the WhatsApp Business number. Bot will:

- Show car options
- Handle bookings
- Provide fallback responses (Gemini)

---

## 🧪 9. Optional: Send Message via API

Test with Postman or `curl`:

```bash
curl -X POST https://graph.facebook.com/v19.0/<PHONE_NUMBER_ID>/messages \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
        "messaging_product": "whatsapp",
        "to": "<RECIPIENT_PHONE_NUMBER>",
        "type": "text",
        "text": { "body": "Hello from bot!" }
      }'
```

---

## 📎 Example Message Code (Node.js)

```js
await axios.post(
  `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
  {
    messaging_product: 'whatsapp',
    to: userPhoneNumber,
    type: 'text',
    text: { body: "Your message here" }
  },
  {
    headers: {
      Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  }
);
```

---

## 🧼 10. Clean Exit

To stop the bot and Ngrok:

```bash
# In bot terminal
Ctrl + C

# In Ngrok terminal
Ctrl + C
```

---

## ✅ Done!

Your WhatsApp bot should now be live, connected to Meta's webhook, and capable of responding in real-time.
