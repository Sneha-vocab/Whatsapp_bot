
# 📘 Meta Developer Account & WhatsApp Business API Integration Guide

## 1. Create a Meta Developer Account
1. Visit [https://developers.facebook.com](https://developers.facebook.com)
2. Log in with your Facebook account (create one if needed).
3. Click **"Get Started"** in the top-right corner.
4. Complete the onboarding:
   - Accept the terms.
   - Verify account (email or phone).
   - Choose your role (Developer or Business).

---

## 2. Create a Meta App
1. In the Meta Developer dashboard, go to **My Apps > Create App**.
2. Select **Business** as the app type.
3. Fill in the details:
   - App Name
   - Contact Email
   - Business Manager account (or create one)
4. Click **Create App**.

---

## 3. Add WhatsApp Product to the App
1. From your App Dashboard, scroll to **Add a Product**.
2. Find **WhatsApp** and click **Set Up**.

---

## 4. Set Up WhatsApp Sandbox
1. After setup, Meta provides a **test phone number**.
2. Send the auto-generated code via WhatsApp to the number from your phone.
3. This links your number with the sandbox for testing.

---

## 5. Generate a Temporary Access Token
1. Navigate to **WhatsApp > Getting Started** inside your app.
2. Copy the following values:
   - **Temporary Access Token** (valid for 24 hours)
   - **Phone Number ID**
   - **WhatsApp Business Account ID**

---

## 6. Test WhatsApp API

### ✅ Sample API Request to Send Message

**POST URL:**
```
https://graph.facebook.com/v19.0/<PHONE_NUMBER_ID>/messages
```

**Headers:**
```http
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "messaging_product": "whatsapp",
  "to": "<RECIPIENT_PHONE_NUMBER>",
  "type": "text",
  "text": {
    "body": "Hello from Meta WhatsApp API!"
  }
}
```

Use tools like **Postman** or **cURL** for testing.

---

## 7. Register a Webhook

1. Go to **Webhooks** in your App Dashboard.
2. Click **Add Callback URL**.
   - **Callback URL**: your backend endpoint
   - **Verify Token**: any random string
3. Subscribe to the following fields:
   - `messages`
   - `message_status`

---

## 8. Generate a Permanent Access Token

1. Go to [Access Token Tool](https://developers.facebook.com/tools/explorer/).
2. Select your app and generate a token with scopes:
   - `whatsapp_business_messaging`
   - `business_management`
3. Exchange for a long-lived token via:
```
GET https://graph.facebook.com/v19.0/oauth/access_token
```

**Params:**
- `grant_type=fb_exchange_token`
- `client_id=<APP_ID>`
- `client_secret=<APP_SECRET>`
- `fb_exchange_token=<SHORT_LIVED_TOKEN>`

---

## 9. Move to Production

1. Complete **Business Verification** (Submit docs, verify domain, etc.).
2. Add your **own phone number** through **WhatsApp Manager**.
3. Submit **message templates** for approval.
4. After approval, send messages via the live number.

---


## ✅ Useful Links

- Meta Developer Portal: [https://developers.facebook.com](https://developers.facebook.com)
- API Reference: [https://developers.facebook.com/docs/whatsapp](https://developers.facebook.com/docs/whatsapp)
- Graph API Explorer: [https://developers.facebook.com/tools/explorer](https://developers.facebook.com/tools/explorer)
