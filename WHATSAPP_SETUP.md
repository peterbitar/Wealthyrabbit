# WhatsApp Notifications Setup Guide

WealthyRabbit can send stock alerts and portfolio updates via WhatsApp using Twilio's WhatsApp Business API.

## Prerequisites

- A Twilio account (free tier available)
- A WhatsApp-enabled phone number

## Setup Steps

### 1. Create a Twilio Account

1. Go to [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Sign up for a free account
3. Verify your email and phone number

### 2. Get Your Twilio Credentials

1. Go to your [Twilio Console Dashboard](https://www.twilio.com/console)
2. Find your **Account SID** and **Auth Token**
3. Copy these values

### 3. Set Up WhatsApp Sandbox (For Testing)

Twilio provides a WhatsApp Sandbox for testing:

1. Go to [Twilio Console > Messaging > Try it out > Send a WhatsApp message](https://www.twilio.com/console/sms/whatsapp/sandbox)
2. Follow the instructions to join the sandbox by sending a message from your WhatsApp to the provided number
3. The sandbox number is usually: `+1 415 523 8886`
4. You'll need to send a code like "join [your-code]" to activate it

### 4. Configure Environment Variables

Add your Twilio credentials to `.env`:

```env
TWILIO_ACCOUNT_SID="your_account_sid_here"
TWILIO_AUTH_TOKEN="your_auth_token_here"
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"
```

Replace the placeholders with your actual values.

### 5. Configure App Settings

1. Go to the **Manage** page in the app
2. Enable the **WhatsApp** toggle under "Delivery Channels"
3. Enter your phone number with country code (e.g., `+1234567890`)
4. Select your preferred notification mode:
   - **Calm**: Only major events (±5% price changes)
   - **Balanced**: Daily summaries + key insights (±2% changes)
   - **Active**: Real-time alerts (±1% changes)

## Notification Types

### Stock Alerts
Triggered when stocks in your portfolio have significant price movements based on your notification mode:

```
📈 AAPL (Apple Inc.)
Price: $150.25
Change: +3.45%

Significant price movement detected!
```

### Portfolio Updates
Daily summary of your portfolio performance:

```
📈 Portfolio Update

Total Value: $21,749.52
Today: +$234.56 (+1.09%)

🏆 Top Gainer: NVDA +4.23%

⚠️ Top Loser: TSLA -2.15%

🐇 WealthyRabbit
```

### Daily Digest
Comprehensive daily report (mode-dependent):

```
🌅 Daily Market Digest

Portfolio: $21,749.52
Today: +$234.56 (+1.09%)

Notable Moves:
📈 NVDA: +4.23%
📈 META: +2.15%
📉 TSLA: -2.15%

🐇 WealthyRabbit
```

## Sending Test Notifications

You can manually trigger notifications using the API:

```bash
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your_user_id",
    "type": "stock_alert",
    "data": {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "currentPrice": 150.25,
      "changePercent": 3.45,
      "alert": "Significant price movement detected!"
    }
  }'
```

## Production Setup

For production use, you'll need:

1. **Approved WhatsApp Business Account**
   - Apply for WhatsApp Business API access through Twilio
   - This requires business verification
   - Can take several weeks for approval

2. **Dedicated Phone Number**
   - Purchase a Twilio phone number
   - Enable WhatsApp on that number
   - Update `TWILIO_WHATSAPP_NUMBER` in `.env`

3. **Message Templates**
   - For production, WhatsApp requires pre-approved message templates
   - Submit templates through Twilio Console
   - Update notification messages to use approved templates

## Troubleshooting

### Messages not sending

1. Check that Twilio credentials are correct in `.env`
2. Verify you've joined the WhatsApp Sandbox
3. Ensure phone number format is correct: `+[country code][number]`
4. Check Twilio Console logs for error messages

### Invalid phone number error

- Phone number must include country code: `+1234567890`
- No spaces or special characters except `+`
- Number must be WhatsApp-enabled

### "WhatsApp service not configured" error

- Ensure `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are set in `.env`
- Restart the development server after adding credentials

## Cost Information

- **Sandbox**: Free for testing
- **Production Messages**: ~$0.005 per message (varies by country)
- **Twilio Trial**: Includes free credit for testing
- **Message limits**: Sandbox has daily limits; production has higher limits

## API Endpoints

### Save Notification Settings
```
POST /api/notifications/settings
```

### Send Notification
```
POST /api/notifications/send
```

### Check for Pending Notifications
```
GET /api/notifications/send
```

## Support

For issues with:
- **Twilio Setup**: [Twilio Support Docs](https://www.twilio.com/docs/whatsapp)
- **WealthyRabbit**: Open an issue in the repository
