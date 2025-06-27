
import React, { useEffect } from 'react';
import { NotificationMessage, NotificationType } from '../../types.ts';
import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react';

interface ToastProps extends NotificationMessage {
  onDismiss: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, message, type, duration = 5000, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  const typeStyles = {
    [NotificationType.SUCCESS]: {
      bg: 'bg-green-500',
      icon: <CheckCircle className="h-6 w-6 text-white mr-3" />,
    },
    [NotificationType.ERROR]: {
      bg: 'bg-red-500',
      icon: <XCircle className="h-6 w-6 text-white mr-3" />,
    },
    [NotificationType.INFO]: {
      bg: 'bg-blue-500',
      icon: <Info className="h-6 w-6 text-white mr-3" />,
    },
    [NotificationType.WARNING]: {
      bg: 'bg-yellow-500',
      icon: <AlertTriangle className="h-6 w-6 text-white mr-3" />,
    },
  };

  return (
    <div
      className={`max-w-sm w-full ${typeStyles[type].bg} text-white shadow-lg rounded-md pointer-events-auto flex ring-1 ring-black ring-opacity-5 overflow-hidden my-2`}
    >
      <div className="p-4 flex items-center">
        {typeStyles[type].icon}
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button
        onClick={() => onDismiss(id)}
        className="ml-auto p-2 hover:bg-white/20 rounded-md focus:outline-none"
        aria-label="Dismiss notification"
      >
        <X size={18} />
      </button>
    </div>
  );
};


interface ToastNotificationAreaProps {
  notifications: NotificationMessage[];
  onDismiss: (id: string) => void;
}

const ToastNotificationArea: React.FC<ToastNotificationAreaProps> = ({ notifications, onDismiss }) => {
  return (
    <div
      aria-live="assertive"
      className="fixed inset-0 flex flex-col items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-end z-[100]"
    >
      <div className="w-full max-w-sm space-y-2">
        {notifications.map((notification) => (
          <Toast key={notification.id} {...notification} onDismiss={onDismiss} />
        ))}
      </div>
    </div>
  );
};

export default ToastNotificationArea;