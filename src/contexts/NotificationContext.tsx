
import React, { createContext, useState, useCallback, ReactNode } from 'react';
import { NotificationMessage, NotificationType } from '../types.ts';
import ToastNotificationArea from '../components/ui/ToastNotificationArea.tsx';

interface NotificationContextType {
  addNotification: (message: string, type?: NotificationType, duration?: number) => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);

  const addNotification = useCallback((message: string, type: NotificationType = NotificationType.INFO, duration: number = 5000) => {
    const id = new Date().toISOString() + Math.random().toString();
    setNotifications(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <ToastNotificationArea notifications={notifications} onDismiss={removeNotification} />
    </NotificationContext.Provider>
  );
};