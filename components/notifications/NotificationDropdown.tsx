// components/notifications/NotificationDropdown.tsx
import React from 'react';
import NotificationItem from './NotificationItem.tsx';
import { AppNotification } from '../../types.ts';
import Button from '../ui/Button.tsx';
import { X, Loader2 } from 'lucide-react'; // Added Loader2 for load more
import Spinner from '../ui/Spinner.tsx'; // For initial loading state

interface NotificationDropdownProps {
  isOpen: boolean;
  notifications: AppNotification[];
  onClose: () => void;
  onMarkAsRead: (notificationId: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  isLoading: boolean; // For initial load or when marking all as read etc.
  onLoadMore: () => Promise<void>;
  hasMore: boolean;
  isLoadingMore?: boolean; // Specific state for when "Load More" is clicked, if context provides it
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  notifications,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  isLoading, // This is the general loading from context
  onLoadMore,
  hasMore,
  // isLoadingMore, // If you implement a specific loading state for the "Load More" button
}) => {
  if (!isOpen) return null;

  // We use the general `isLoading` for the initial full panel loading.
  // `isLoadingMore` could be a separate state managed if the `onLoadMore` itself sets a loading state.
  // For simplicity now, the "Load More" button will just show its own loading state if needed or disable.

  return (
    <div 
      className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-md shadow-xl z-50 border border-gray-200 overflow-hidden flex flex-col"
      style={{ maxHeight: 'calc(100vh - 80px)'}} // Prevent dropdown from being too tall
    >
      <div className="flex justify-between items-center p-3 border-b sticky top-0 bg-white z-10">
        <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
          <X size={20} />
        </Button>
      </div>

      {isLoading && notifications.length === 0 ? ( // Show main spinner only if loading and no notifications yet displayed
        <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center h-48">
            <Spinner size="md"/>
            <p className="mt-2">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          You have no new notifications.
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-y-auto flex-grow p-2">
          {notifications.map((notif) => (
            <NotificationItem key={notif.id} notification={notif} onMarkAsRead={onMarkAsRead} />
          ))}
        </ul>
      )}

      {notifications.length > 0 && ( // Show footer only if there are notifications
        <div className="p-2 border-t sticky bottom-0 bg-white z-10 space-y-2">
           {hasMore && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onLoadMore} 
              className="w-full text-primary"
              //isLoading={isLoadingMore} // Pass this if context provides specific load more loading state
              disabled={isLoading} // Disable if general loading is true
            >
              {isLoading ? <Loader2 className="animate-spin mr-2" size={16}/> : null}
              Load More
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onMarkAllAsRead} className="w-full" disabled={isLoading}>
            Mark all as read
          </Button>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;