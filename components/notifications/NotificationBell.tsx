// components/notifications/NotificationBell.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown.tsx';
import { useNotificationCenter } from '../../contexts/NotificationCenterContext.tsx'; // Import the hook

const NotificationBell: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    handleMarkAsRead, 
    handleMarkAllAsRead,
    fetchNotifications, // To potentially refresh or load initial
    loadMoreNotifications,
    hasMoreNotifications
  } = useNotificationCenter();

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
    if (!isDropdownOpen && notifications.length === 0 && !isLoading) { // Fetch if opening and no notifications loaded yet
        fetchNotifications(1); // Fetch first page
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="relative p-2 rounded-full text-gray-600 hover:bg-gray-100 hover:text-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
        aria-label="View notifications"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-4 w-4 transform -translate-y-1/2 translate-x-1/2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 text-white text-xs items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>
      <NotificationDropdown 
        isOpen={isDropdownOpen} 
        onClose={() => setIsDropdownOpen(false)}
        notifications={notifications}
        isLoading={isLoading}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        onLoadMore={loadMoreNotifications}
        hasMore={hasMoreNotifications}
      />
    </div>
  );
};

export default NotificationBell;