import { useState, useEffect, useCallback } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { notificationApi, subscriptionApi, boardApi } from '../../api/awsApi';

function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await notificationApi.listMyNotifications();
      setNotifications(data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    // Poll every 5s as fallback
    const interval = setInterval(loadNotifications, 5000);

    // Realtime subscription
    let unsubscribe;
    if (user?.userId) {
      unsubscribe = subscriptionApi.subscribeToNotifications(user.userId, (newNotif) => {
        setNotifications(prev => [newNotif, ...prev]);
      });
    }

    return () => {
      clearInterval(interval);
      if (unsubscribe) unsubscribe();
    };
  }, [user?.userId, loadNotifications]);

  // Refresh when opening dropdown
  const handleToggle = () => {
    if (!showDropdown) loadNotifications();
    setShowDropdown(!showDropdown);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkRead = async (notif) => {
    if (notif.isRead) return;
    try {
      await notificationApi.markAsRead(notif.notificationId, notif.timestamp);
      setNotifications((prev) =>
        prev.map((n) => (n.notificationId === notif.notificationId ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleRespondInvite = async (e, notif, accept) => {
    e.stopPropagation();
    try {
      await boardApi.respondToInvite(notif.boardId, accept);
      await handleMarkRead(notif);
    } catch (err) {
      console.error('Failed to respond to invite:', err);
      alert('Lỗi: Không thể phản hồi lời mời.');
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;
    try {
      await Promise.all(unread.map(n => notificationApi.markAsRead(n.notificationId, n.timestamp)));
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  return (
    <div className="notification-bell">
      <button onClick={handleToggle} className="btn-secondary" style={{ position: 'relative', background: 'transparent' }}>
        🔔
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {showDropdown && (
        <div className="notifications-dropdown">
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span 
                onClick={handleMarkAllRead} 
                style={{ fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 'normal' }}
              >
                ✓ Đọc tất cả
              </span>
            )}
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No notifications
            </div>
          ) : (
            notifications.map((n) => (
              <div 
                key={n.notificationId} 
                className={`notification-item ${!n.isRead ? 'unread' : ''}`}
                onClick={() => handleMarkRead(n)}
                style={{ cursor: n.isRead ? 'default' : 'pointer' }}
              >
                <div style={{ fontSize: '0.85rem' }}>{n.message}</div>
                {n.type === 'BOARD_INVITED' && !n.isRead && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="btn-primary" 
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                      onClick={(e) => handleRespondInvite(e, n, true)}
                    >
                      Đồng ý
                    </button>
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                      onClick={(e) => handleRespondInvite(e, n, false)}
                    >
                      Từ chối
                    </button>
                  </div>
                )}
                <div className="notification-time">
                  {new Date(n.timestamp).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function Layout() {
  const { user, signOut } = useAuth();

  return (
    <div className="app-layout">
      <header className="app-header">
        <Link to="/dashboard" className="logo">
          ⚡ TaskManager
        </Link>
        
        <div className="header-right">
          <NotificationBell />
          
          <div className="user-profile">
            <div className="avatar" title={user?.displayName}>
              {user?.displayName?.charAt(0)?.toUpperCase()}
            </div>
            <button onClick={signOut} className="btn-logout">
              Log out
            </button>
          </div>
        </div>
      </header>
      
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
