import express from 'express';
import { setupBot } from './bot';

const app = express();
const bot = setupBot();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Telegram webhook endpoint
app.use(bot.webhookCallback('/telegram-webhook'));

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Register webhook with Telegram (only on startup)
  try {
    const webhookUrl = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/telegram-webhook`
      : `http://localhost:${PORT}/telegram-webhook`;

    console.log(`📡 Setting Telegram webhook to: ${webhookUrl}`);

    const webhookInfo = await bot.telegram.setWebhook(webhookUrl);
    console.log('✅ Webhook registered:', webhookInfo);
  } catch (error) {
    console.error('❌ Error setting webhook:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
