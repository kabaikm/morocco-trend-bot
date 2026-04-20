import { Telegraf, Context } from 'telegraf';
import { postToLinkedIn } from './linkedin';
import { GroqService } from './services/groq.service';
import { ImageService } from './services/image.service';

const YOUR_TELEGRAM_ID = process.env.YOUR_TELEGRAM_ID || '721012210';

interface BotContext extends Context {
  session?: {
    topic?: string;
    content?: string;
    imageUrl?: string;
  };
}

export function setupBot() {
  const bot = new Telegraf<BotContext>(process.env.BOT_TOKEN!);

  // Guard: only YOU can use this bot
  bot.use(async (ctx, next) => {
    if (String(ctx.from?.id) !== YOUR_TELEGRAM_ID) {
      return ctx.reply('🔒 Unauthorized. This bot is private.');
    }
    return next();
  });

  // /start command
  bot.command('start', async (ctx) => {
    await ctx.reply(
      `👋 Welcome to Morocco Trend Bot!\n\n` +
      `I help you discover trending topics and create professional LinkedIn posts automatically.\n\n` +
      `Available Commands:\n` +
      `🔥 /trends - Discover current trending topics\n` +
      `✍️ /custom - Create post from custom topic\n` +
      `📋 /history - View your post history\n` +
      `⚙️ /settings - Configure preferences\n` +
      `❓ /help - Show help menu\n` +
      `❌ /cancel - Cancel current action\n\n` +
      `How it works:\n` +
      `1️⃣ Discover or enter a trending topic\n` +
      `2️⃣ Choose a writing style\n` +
      `3️⃣ AI generates content + image\n` +
      `4️⃣ Preview and approve\n` +
      `5️⃣ Publish to LinkedIn!\n\n` +
      `Let's get started! 🚀`
    );
  });

  // /trends command
  bot.command('trends', async (ctx) => {
    await ctx.reply('🔍 Fetching trending topics...');

    try {
      const trends = [
        'Morocco Tourism Growth',
        'Tech Innovation in Casablanca',
        'Morocco-EU Trade Agreement',
        'Renewable Energy Projects',
        'Digital Transformation',
      ];

      const message =
        `🔥 Trending Topics in Morocco:\n\n` +
        trends.map((t, i) => `${i + 1}. ${t}`).join('\n') +
        `\n\n💡 Reply with any topic to generate a post!`;

      await ctx.reply(message);
      if (ctx.session) {
        ctx.session.topic = undefined;
      }
    } catch (error) {
      await ctx.reply('❌ Error fetching trends. Please try again.');
    }
  });

  // /custom command
  bot.command('custom', async (ctx) => {
    await ctx.reply('✍️ What topic would you like to create a post about?');
  });

  // /help command
  bot.command('help', async (ctx) => {
    await ctx.reply(
      `❓ Help Menu\n\n` +
      `Commands:\n` +
      `/start - Show welcome message\n` +
      `/trends - Get trending topics\n` +
      `/custom - Create custom post\n` +
      `/history - View past posts\n` +
      `/settings - Configure bot\n` +
      `/help - Show this menu\n` +
      `/cancel - Cancel current action\n\n` +
      `Simply reply with a topic name to generate a LinkedIn post!`
    );
  });

  // /cancel command
  bot.command('cancel', async (ctx) => {
    if (ctx.session) {
      ctx.session.topic = undefined;
      ctx.session.content = undefined;
      ctx.session.imageUrl = undefined;
    }
    await ctx.reply('❌ Action cancelled.');
  });

  // Handle text input (topic selection)
  bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();

    if (text.startsWith('/')) {
      return; // Let command handlers deal with it
    }

    // User provided a topic
    if (ctx.session) {
      ctx.session.topic = text;
    }

    await ctx.reply(`📝 Generating content for: ${text}...\n⏳ This may take a moment...`);

    try {
      // Generate content with Groq
      const content = await GroqService.generateLinkedInContent({
        topic: text,
        style: 'professional',
        language: 'English',
        includeHashtags: true,
      });

      // Generate image with Pollinations
      const image = await ImageService.generateLinkedInImage({
        topic: text,
        title: content.title,
        style: 'professional',
      });

      if (ctx.session) {
        ctx.session.content = content.content;
        ctx.session.imageUrl = image.imageUrl;
      }

      // Show preview
      const preview =
        `📰 **${content.title}**\n\n` +
        `${content.content}\n\n` +
        `${content.hashtags.join(' ')}\n\n` +
        `🖼️ Image: ${image.imageUrl}`;

      await ctx.reply(preview, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Approve', callback_data: 'approve' },
              { text: '❌ Reject', callback_data: 'reject' },
            ],
            [
              { text: '✏️ Edit', callback_data: 'edit' },
              { text: '📅 Schedule', callback_data: 'schedule' },
            ],
          ],
        },
      });
    } catch (error) {
      console.error('Error generating content:', error);
      await ctx.reply('❌ Error generating content. Please try again.');
    }
  });

  // Handle callback queries (button clicks)
  bot.action('approve', async (ctx) => {
    await ctx.answerCbQuery();

    if (!ctx.session?.content || !ctx.session?.imageUrl) {
      return ctx.reply('❌ No content to publish. Please generate a post first.');
    }

    await ctx.reply('📤 Publishing to LinkedIn...');

    try {
      const result = await postToLinkedIn(ctx.session.content, ctx.session.imageUrl);

      if (result.success) {
        await ctx.reply(`✅ Post published to LinkedIn!\n🔗 ${result.postUrl}`);
        if (ctx.session) {
          ctx.session.topic = undefined;
          ctx.session.content = undefined;
          ctx.session.imageUrl = undefined;
        }
      } else {
        await ctx.reply(`❌ Publishing Error\n\n${result.error}`);
      }
    } catch (error) {
      console.error('Error publishing:', error);
      await ctx.reply('❌ Error publishing to LinkedIn. Please try again.');
    }
  });

  bot.action('reject', async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.session) {
      ctx.session.topic = undefined;
      ctx.session.content = undefined;
      ctx.session.imageUrl = undefined;
    }
    await ctx.reply('❌ Post rejected. Generate another one?');
  });

  bot.action('edit', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('✏️ Edit feature coming soon!');
  });

  bot.action('schedule', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('📅 Schedule feature coming soon!');
  });

  // Error handling
  bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply('❌ An error occurred. Please try again.');
  });

  return bot;
}
