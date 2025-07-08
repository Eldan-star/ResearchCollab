// components/notifications/NotificationItem.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { AppNotification, NotificationTypeEnum } from '../../types.ts'; // Assuming types.ts is updated
import { BellRing, MessageSquare, CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';

interface NotificationItemProps {
  notification: AppNotification;
  onMarkAsRead?: (notificationId: string) => void; // Optional for now
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onMarkAsRead }) => {
  const getIcon = () => {
    switch (notification.type) {
      case NotificationTypeEnum.NEW_APPLICATION:
        return <BellRing size={18} className="text-blue-500" />;
      case NotificationTypeEnum.APPLICATION_STATUS_UPDATE:
        return <CheckCircle size={18} className="text-green-500" />;
      case NotificationTypeEnum.NEW_MESSAGE_IN_PROJECT:
        return <MessageSquare size={18} className="text-purple-500" />;
      case NotificationTypeEnum.PROJECT_MILESTONE_UPDATE:
        return <AlertCircle size={18} className="text-yellow-500" />;
      default:
        return <Info size={18} className="text-gray-500" />;
    }
  };

  const content = (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
      <div className="flex-1">
        <p className={`text-sm ${notification.is_read ? 'text-gray-500' : 'text-gray-800 font-medium'}`}>
          {notification.message}
        </p>
        <p className={`text-xs ${notification.is_read ? 'text-gray-400' : 'text-gray-500'}`}>
          {new Date(notification.created_at).toLocaleString()}
        </p>
      </div>
      {!notification.is_read && onMarkAsRead && (
        <button 
          onClick={(e) => {
            e.stopPropagation(); // Prevent link click if item is a link
            e.preventDefault();
            onMarkAsRead(notification.id);
          }}
          title="Mark as read"
          className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600"
        >
          <XCircle size={16} /> 
        </button>
      )}
    </div>
  );

  return (
    <li className={`p-3 hover:bg-gray-50 rounded-md transition-colors ${!notification.is_read ? 'bg-primary-light/10 border-l-4 border-primary' : 'border-l-4 border-transparent'}`}>
      {notification.link ? (
        <Link to={notification.link} className="block w-full focus:outline-none focus:ring-2 focus:ring-primary rounded">
          {content}
        </Link>
      ) : (
        <div className="cursor-default">
          {content}
        </div>
      )}
    </li>
  );
};

export default NotificationItem;