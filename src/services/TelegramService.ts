/**
 * TelegramService - Handles sending notifications via Telegram Bot API
 */
export const TelegramService = {
  /**
   * Sends a message to a specific Telegram Chat
   */
  sendMessage: async (token: string, chatId: string, text: string): Promise<boolean> => {
    if (!token || !chatId) return false;

    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML',
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Telegram notification error:', error);
      return false;
    }
  },

  /**
   * Formats a task warning message for Telegram
   */
  formatTaskWarning: (taskTitle: string, dueDate: string, role: string): string => {
    return `<b>⚠️ CẢNH BÁO DEADLINE</b>\n\n` +
           `📌 <b>Task:</b> ${taskTitle}\n` +
           `🏷️ <b>Phân loại:</b> ${role}\n` +
           `⏰ <b>Hạn chót:</b> ${dueDate}\n\n` +
           `<i>Hãy hoàn thành sớm để tránh bị dồn việc nhé! ✨</i>`;
  }
};
