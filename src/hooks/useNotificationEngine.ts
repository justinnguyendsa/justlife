import { useEffect, useRef } from 'react';
import { useTaskStore } from './useTaskStore';
import { useSettingsStore } from './useSettingsStore';
import { TelegramService } from '../services/TelegramService';

export function useNotificationEngine() {
  const { tasks } = useTaskStore();
  const { settings } = useSettingsStore();
  
  // Persistent notified IDs (using localStorage so it doesn't resend on reload)
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem('justlife_notified_task_ids');
    if (saved) {
      try {
        const ids = JSON.parse(saved);
        if (Array.isArray(ids)) {
          notifiedIdsRef.current = new Set(ids);
        }
      } catch (e) {
        console.error('Failed to parse notified task IDs', e);
      }
    }
  }, []);

  const saveNotifiedIds = () => {
    localStorage.setItem('justlife_notified_task_ids', JSON.stringify(Array.from(notifiedIdsRef.current)));
  };

  useEffect(() => {
    // Nếu cả 2 kênh thông báo đều tắt, thoát
    const hasTelegram = settings.telegramToken && settings.telegramChatId;
    const hasBrowser = settings.enableNotifications && ('Notification' in window) && Notification.permission === 'granted';

    if (!hasTelegram && !hasBrowser) return;

    const checkDeadlines = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const pendingTasks = tasks.filter(t => !t.completed && t.deadline);
      let changed = false;

      for (const task of pendingTasks) {
        if (notifiedIdsRef.current.has(task.id)) continue;

        const taskDate = new Date(task.deadline!);
        taskDate.setHours(0, 0, 0, 0);
        
        const diffDays = Math.ceil((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // Logic: Báo nếu đến hạn (diffDays <= 0) hoặc lọt vào vùng Soft Deadline (diffDays <= softDeadlineOffset)
        if (diffDays <= settings.softDeadlineOffset) {
           const message = diffDays < 0 
             ? `🚨 QUÁ HẠN: "${task.title}" đã trễ ${Math.abs(diffDays)} ngày!`
             : diffDays === 0
               ? `⚠️ HÔM NAY: "${task.title}" đến hạn chót!`
               : `🔔 SẮP ĐẾN HẠN: "${task.title}" còn ${diffDays} ngày (Soft Deadline).`;

           // 1. Browser Notification
           if (hasBrowser) {
             new Notification('JustLife Alert', { body: message });
           }

           // 2. Telegram Notification
           if (hasTelegram) {
             const telegramText = TelegramService.formatTaskWarning(task.title, task.deadline!, task.role);
             await TelegramService.sendMessage(settings.telegramToken, settings.telegramChatId, telegramText);
           }

           notifiedIdsRef.current.add(task.id);
           changed = true;
        }
      }

      if (changed) saveNotifiedIds();
    };

    checkDeadlines();
    const interval = setInterval(checkDeadlines, 30 * 60 * 1000); // Mỗi 30 phút
    return () => clearInterval(interval);
  }, [tasks, settings]);
}
