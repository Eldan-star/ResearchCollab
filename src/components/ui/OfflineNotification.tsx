import React from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus'; // Adjusted path

export function OfflineNotification() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#333',
      color: 'white',
      padding: '10px 20px',
      borderRadius: '5px',
      zIndex: 1000,
      textAlign: 'center',
      fontSize: '0.9em'
    }}>
      You are currently offline. Some features may not be available.
    </div>
  );
}
