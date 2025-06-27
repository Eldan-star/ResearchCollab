// contexts/NotificationCenterContext.tsx
import React, { createContext, useState, useEffect, useCallback, ReactNode, useContext } from 'react';
import { AppNotification } from '../types.ts'; // Ensure this path is correct
import { 
    getAppNotificationsForUser, 
    getUnreadNotificationsCount, 
    markNotificationAsRead, 
    markAllUserNotificationsAsRead 
} from '../services/apiService.ts'; // Ensure this path is correct
import { useAuth } from '../hooks/useAuth.ts'; 

interface NotificationCenterContextType {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: (page?: number, limit?: number) => Promise<void>;
  handleMarkAsRead: (notificationId: string) => Promise<void>;
  handleMarkAllAsRead: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  loadMoreNotifications: () => Promise<void>;
  hasMoreNotifications: boolean;
}

const NotificationCenterContext = createContext<NotificationCenterContextType | undefined>(undefined);

interface NotificationCenterProviderProps {
  children: ReactNode;
}

const NOTIFICATIONS_PER_PAGE = 10;

export const NotificationCenterProvider: React.FC<NotificationCenterProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMoreNotifications, setHasMoreNotifications] = useState<boolean>(true);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const { count, error } = await getUnreadNotificationsCount();
      if (error) {
        console.error("Failed to refresh unread count:", error);
      } else {
        setUnreadCount(count);
      }
    } catch (err) {
      console.error("Exception refreshing unread count:", err);
    }
  }, [user]);

  const fetchNotifications = useCallback(async (pageToFetch: number = 1, limit: number = NOTIFICATIONS_PER_PAGE) => {
    if (!user) {
      setNotifications([]);
      setHasMoreNotifications(false);
      if (pageToFetch === 1) setCurrentPage(1); // Reset page if user logs out
      return;
    }
    setIsLoading(true);
    try {
      const { data, error, count } = await getAppNotificationsForUser(pageToFetch, limit);
      if (error) {
        console.error("Failed to fetch notifications:", error);
        if (pageToFetch === 1) setNotifications([]);
        setHasMoreNotifications(false);
      } else {
        const newNotifications = data || [];
        if (pageToFetch === 1) {
            setNotifications(newNotifications);
        } else {
            // Avoid duplicates if fetching same page multiple times or if data overlaps
            setNotifications(prev => {
                const existingIds = new Set(prev.map(n => n.id));
                const uniqueNewNotifications = newNotifications.filter(n => !existingIds.has(n.id));
                return [...prev, ...uniqueNewNotifications];
            });
        }
        setCurrentPage(pageToFetch);
        // Check against total count from API if available and reliable for hasMore
        const totalFetched = pageToFetch === 1 ? newNotifications.length : notifications.length + newNotifications.filter(n => !notifications.find(existing => existing.id === n.id)).length;
        setHasMoreNotifications(newNotifications.length === limit && (count ? totalFetched < count : true) );

        // Refresh unread count after fetching new notifications
        await refreshUnreadCount();
      }
    } catch (err) {
        console.error("Exception fetching notifications:", err);
        if (pageToFetch === 1) setNotifications([]);
        setHasMoreNotifications(false);
    } finally {
      setIsLoading(false);
    }
  }, [user, refreshUnreadCount, notifications]); // Added notifications to dep array for `notifications.length` in hasMore check


  const loadMoreNotifications = useCallback(async () => {
    if (isLoading || !hasMoreNotifications || !user) return;
    await fetchNotifications(currentPage + 1);
  }, [isLoading, hasMoreNotifications, user, currentPage, fetchNotifications]);
  

  useEffect(() => {
    if (user) {
      fetchNotifications(1); // Fetch first page on user login or context mount with user
      // refreshUnreadCount is called within fetchNotifications
    } else {
      // Clear state if user logs out
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      setHasMoreNotifications(true); // Reset for next login
      setCurrentPage(1);
    }
  }, [user]); // Only re-run when user object itself changes (login/logout)
  // Removed fetchNotifications from here to avoid loop, initial call is fine. refreshUnreadCount too.

  const handleMarkAsRead = async (notificationId: string) => {
    const originalNotifications = [...notifications];
    // Optimistically update UI
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    const previouslyUnread = originalNotifications.find(n => n.id === notificationId && !n.is_read);
    if (previouslyUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
    }

    try {
      const { error } = await markNotificationAsRead(notificationId);
      if (error) {
        console.error("Failed to mark notification as read on backend:", error);
        // Revert optimistic update if backend failed
        setNotifications(originalNotifications);
        if (previouslyUnread) setUnreadCount(prev => prev + 1);
        // Add toast notification for error
      }
    } catch (err) {
        console.error("Exception marking notification as read:", err);
        setNotifications(originalNotifications);
        if (previouslyUnread) setUnreadCount(prev => prev + 1);
    }
  };

  const handleMarkAllAsRead = async () => {
    const originalNotifications = [...notifications];
    const unreadNotificationsCountBefore = unreadCount;

    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      const { error } = await markAllUserNotificationsAsRead();
      if (error) {
        console.error("Failed to mark all notifications as read on backend:", error);
        // Revert optimistic update
        setNotifications(originalNotifications);
        setUnreadCount(unreadNotificationsCountBefore);
        // Add toast
      }
    } catch (err) {
        console.error("Exception marking all notifications as read:", err);
        setNotifications(originalNotifications);
        setUnreadCount(unreadNotificationsCountBefore);
    }
  };

  const value = {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    handleMarkAsRead,
    handleMarkAllAsRead,
    refreshUnreadCount,
    loadMoreNotifications,
    hasMoreNotifications,
  };

  return (
    <NotificationCenterContext.Provider value={value}>
      {children}
    </NotificationCenterContext.Provider>
  );
};

export const useNotificationCenter = (): NotificationCenterContextType => {
  const context = useContext(NotificationCenterContext);
  if (context === undefined) {
    throw new Error('useNotificationCenter must be used within a NotificationCenterProvider');
  }
  return context;
};