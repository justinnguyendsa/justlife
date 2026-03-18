import { useEffect, useRef } from 'react';
import { useTaskStore } from './useTaskStore';
import { useSettingsStore } from './useSettingsStore';

export function useNotificationEngine() {
  const { tasks } = useTaskStore();
  const { settings } = useSettingsStore();
  const notifiedMap = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Nếu tắt thông báo hoặc trình duyệt không hỗ trợ, thoát
    if (!settings.enableNotifications || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const checkDeadlines = () => {
      const today = new Date().toISOString().split('T')[0];
      const pendingTasks = tasks.filter(t => !t.completed && t.deadline);

      pendingTasks.forEach(task => {
        // Chỉ thông báo nếu chưa thông báo
        if (notifiedMap.current.has(task.id)) return;

        if (task.deadline === today) {
          new Notification('⚠️ Sắp hết hạn (Soft Deadline)', {
            body: `Công việc "${task.title}" có hạn chót trên hệ thống là hôm nay!`,
            icon: '/vite.svg', // Thẻ icon tạm
          });
          notifiedMap.current.add(task.id);
        } else if (task.deadline && task.deadline < today) {
          // Báo Overdue
          new Notification('🚨 Đã quá hạn!', {
            body: `Công việc "${task.title}" ĐÃ QUÁ HẠN!`,
          });
          notifiedMap.current.add(task.id);
        }
      });
    };

    // Chạy kiểm tra ban đầu
    checkDeadlines();

    // Chạy lại mỗi giờ (để bắt lúc qua ngày mới)
    const interval = setInterval(checkDeadlines, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [tasks, settings.enableNotifications]);
}
