import express, { Request, Response } from 'express';
import { TelegramService, TelegramMessage } from '../services/telegram.service';
import { ContentService } from '../services/content.service';
import { LinkedInService } from '../services/linkedin.service';

const router = express.Router();

// Store pending posts for approval
interface PendingPost {
  postId: string;
  content: string;
  imageUrl?: string;
  topic: string;
  createdAt: Date;
}

const pendingPosts: Map<string, PendingPost> = new Map();

// Telegram webhook handler
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const message: TelegramMessage = req.body;

    // Handle text messages
    if (message.message?.text) {
      const text = message.message.text;
      const chatId = message.message.chat.id;

      if (text === '/start') {
        await handleStartCommand(chatId);
      } else if (text === '/trends') {
        await handleTrendsCommand(chatId);
      } else if (text === '/cancel') {
        await handleCancelCommand(chatId);
      } else if (text.startsWith('/')) {
        await TelegramService.sendMessage(chatId, '❌ Unknown command. Use /start to see available commands.');
      } else {
        // Treat as custom topic
        await handleCustomTopic(chatId, text);
      }
    }

    // Handle callback queries (button clicks)
    if (message.callback_query) {
      await handleCallbackQuery(message.callback_query);
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Error handling Telegram webhook:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

async function handleStartCommand(chatId: number) {
  const welcomeMessage = `
👋 <b>Welcome to Morocco Trend Bot!</b>

I help you create and publish professional LinkedIn posts about trending topics in Morocco.

<b>Available commands:</b>
/trends - See trending topics
/cancel - Cancel current operation

Or just <b>send me any topic</b> to generate a post!

What would you like to do?
  `;

  await TelegramService.sendMessage(chatId, welcomeMessage);
}

async function handleTrendsCommand(chatId: number) {
  try {
    await TelegramService.sendMessage(chatId, '🔍 Fetching trending topics...');

    const trends = await ContentService.generateTrendingTopics();

    let trendsMessage = '<b>🔥 Trending Topics in Morocco:</b>\n\n';
    trends.forEach((trend, index) => {
      trendsMessage += `${index + 1}. ${trend}\n`;
    });
    trendsMessage += '\n💡 Reply with any topic to generate a post!';

    await TelegramService.sendMessage(chatId, trendsMessage);
  } catch (error) {
    console.error('Error in trends command:', error);
    await TelegramService.sendMessage(chatId, '❌ Error fetching trends. Please try again.');
  }
}

async function handleCancelCommand(chatId: number) {
  await TelegramService.sendMessage(chatId, '✅ Operation cancelled. Use /start to begin again.');
}

async function handleCustomTopic(chatId: number, topic: string) {
  try {
    await TelegramService.sendMessage(chatId, `📝 Generating content for: <b>${topic}</b>...\n⏳ This may take a moment...`);

    // Generate content
    const content = await ContentService.generateContent({
      topic,
      style: 'professional',
    });

    // Generate image (using mock for now)
    const imageUrl = `https://via.placeholder.com/1200x630?text=${encodeURIComponent(content.title)}`;

    // Store pending post
    const postId = `post_${Date.now()}`;
    pendingPosts.set(postId, {
      postId,
      content: content.content,
      imageUrl,
      topic,
      createdAt: new Date(),
    });

    // Create approval keyboard
    const approvalKeyboard = {
      inline_keyboard: [
        [
          {
            text: '✅ Approve & Publish',
            callback_data: `approve_${postId}`,
          },
          {
            text: '❌ Reject',
            callback_data: `reject_${postId}`,
          },
        ],
        [
          {
            text: '✏️ Edit',
            callback_data: `edit_${postId}`,
          },
          {
            text: '📅 Schedule',
            callback_data: `schedule_${postId}`,
          },
        ],
      ],
    };

    // Send post preview with image
    let previewMessage = `<b>📰 Generated Post Preview</b>\n\n`;
    previewMessage += `<b>Topic:</b> ${topic}\n\n`;
    previewMessage += `<b>Content:</b>\n${content.content}\n\n`;
    previewMessage += `<b>Hashtags:</b> ${content.hashtags.join(' ')}\n\n`;
    previewMessage += `<b>What would you like to do?</b>`;

    await TelegramService.sendPhoto(chatId, imageUrl, previewMessage, approvalKeyboard);
  } catch (error) {
    console.error('Error generating content:', error);
    await TelegramService.sendMessage(chatId, '❌ Error generating content. Please try again.');
  }
}

async function handleCallbackQuery(callbackQuery: any) {
  const chatId = callbackQuery.message?.chat.id;
  const messageId = callbackQuery.message?.message_id;
  const data = callbackQuery.data;
  const callbackQueryId = callbackQuery.id;

  try {
    if (data.startsWith('approve_')) {
      const postId = data.replace('approve_', '');
      const post = pendingPosts.get(postId);

      if (post) {
        await TelegramService.answerCallbackQuery(callbackQueryId, '⏳ Publishing to LinkedIn...');

        try {
          // Publish to LinkedIn
          const result = await LinkedInService.publishPost({
            text: post.content,
            imageUrl: post.imageUrl,
            title: post.topic,
          });

          await TelegramService.editMessageText(
            chatId,
            messageId,
            `✅ <b>Post Published Successfully!</b>\n\n📱 Your post is now live on LinkedIn!\n\n🔗 Post ID: ${result.id || 'Published'}`
          );

          pendingPosts.delete(postId);
        } catch (error) {
          await TelegramService.editMessageText(
            chatId,
            messageId,
            `⚠️ <b>Publishing Error</b>\n\nThere was an issue publishing to LinkedIn. Please check your credentials and try again.`
          );
        }
      }
    } else if (data.startsWith('reject_')) {
      const postId = data.replace('reject_', '');
      pendingPosts.delete(postId);

      await TelegramService.answerCallbackQuery(callbackQueryId, '❌ Post rejected');
      await TelegramService.editMessageText(chatId, messageId, '❌ Post rejected. Use /start to create a new one.');
    } else if (data.startsWith('edit_')) {
      await TelegramService.answerCallbackQuery(callbackQueryId, '✏️ Edit feature coming soon!', true);
    } else if (data.startsWith('schedule_')) {
      await TelegramService.answerCallbackQuery(callbackQueryId, '📅 Schedule feature coming soon!', true);
    }
  } catch (error) {
    console.error('Error handling callback query:', error);
    await TelegramService.answerCallbackQuery(callbackQueryId, '❌ Error processing request', true);
  }
}

export function registerTelegramWebhook(app: express.Application) {
  app.use('/api/telegram', router);
}
