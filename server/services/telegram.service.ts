import axios from 'axios';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8201243488:AAFiUsD_0DjQqp7EL4dmDq9dFGWQrfXZAm4';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const USER_ID = 721012210;

export interface TelegramMessage {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
      title?: string;
      username?: string;
      first_name?: string;
    };
    date: number;
    text?: string;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    message?: {
      message_id: number;
      chat: {
        id: number;
        type: string;
      };
      date: number;
      text?: string;
    };
    data?: string;
  };
}

export class TelegramService {
  static async sendMessage(chatId: number, text: string, replyMarkup?: any) {
    try {
      const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      });
      return response.data;
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      throw error;
    }
  }

  static async sendPhoto(chatId: number, photoUrl: string, caption?: string, replyMarkup?: any) {
    try {
      const response = await axios.post(`${TELEGRAM_API_URL}/sendPhoto`, {
        chat_id: chatId,
        photo: photoUrl,
        caption,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      });
      return response.data;
    } catch (error) {
      console.error('Error sending Telegram photo:', error);
      throw error;
    }
  }

  static async editMessageText(chatId: number, messageId: number, text: string, replyMarkup?: any) {
    try {
      const response = await axios.post(`${TELEGRAM_API_URL}/editMessageText`, {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      });
      return response.data;
    } catch (error) {
      console.error('Error editing Telegram message:', error);
      throw error;
    }
  }

  static async answerCallbackQuery(callbackQueryId: string, text?: string, showAlert?: boolean) {
    try {
      const response = await axios.post(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert,
      });
      return response.data;
    } catch (error) {
      console.error('Error answering callback query:', error);
      throw error;
    }
  }

  static async setWebhook(webhookUrl: string) {
    try {
      const response = await axios.post(`${TELEGRAM_API_URL}/setWebhook`, {
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
      });
      return response.data;
    } catch (error) {
      console.error('Error setting webhook:', error);
      throw error;
    }
  }

  static async getWebhookInfo() {
    try {
      const response = await axios.get(`${TELEGRAM_API_URL}/getWebhookInfo`);
      return response.data;
    } catch (error) {
      console.error('Error getting webhook info:', error);
      throw error;
    }
  }
}
