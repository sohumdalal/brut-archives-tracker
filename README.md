# vinted-brut-notifier

Polls Vinted every 5 minutes for new listings matching Brut Archives / Brut Paris keywords and sends an email notification when something new drops.

## Setup

```bash
npm install
cp .env.example .env
# Fill in your Gmail credentials in .env
npm start
```

## Gmail App Password

You need a Gmail **App Password** (not your regular password):

1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Select "Mail" + "Mac" (or any device)
3. Copy the 16-character password into `.env`

## Configuration

| Variable | Default | Description |
|---|---|---|
| `GMAIL_USER` | — | Your Gmail address |
| `GMAIL_APP_PASSWORD` | — | 16-char Gmail App Password |
| `NOTIFY_EMAIL` | — | Where to send alerts (can be same as above) |
| `POLL_INTERVAL_MINUTES` | `5` | How often to poll Vinted |

## Deploying

To run 24/7, deploy to any Node.js host (Railway, Render, Fly.io) or keep it running locally with:

```bash
npm install -g pm2
pm2 start index.js --name vinted-brut
pm2 save
```
