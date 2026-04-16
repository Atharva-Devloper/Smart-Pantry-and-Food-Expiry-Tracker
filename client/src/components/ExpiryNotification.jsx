import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../config';
import '../styles/ExpiryNotification.css';

const ExpiryNotification = ({ user }) => {
    const [expiringItems, setExpiringItems] = useState([]);
    const [expiredItems, setExpiredItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (user) {
            // Check if user has already seen notification recently (within last 24 hours)
            const lastDismissed = localStorage.getItem('notificationLastDismissed');
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            if (lastDismissed && new Date(lastDismissed) > twentyFourHoursAgo) {
                // Don't show notification if dismissed within last 24 hours
                setLoading(false);
                return;
            }

            fetchExpiringProducts();
        }
    }, [user]);

    const fetchExpiringProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/products/expiring`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                setExpiringItems(data.expiring || []);
                setExpiredItems(data.expired || []);

                // Show notification only if there are items
                if (data.expiring.length > 0 || data.expired.length > 0) {
                    setVisible(true);
                }
            }
        } catch (error) {
            console.error('Error fetching expiring products:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((date - today) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry === 0) return 'Today';
        if (daysUntilExpiry === 1) return 'Tomorrow';
        if (daysUntilExpiry > 0) return `In ${daysUntilExpiry} days`;
        return `${Math.abs(daysUntilExpiry)} days ago`;
    };

    const getExpiryStatusColor = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((date - today) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 0) return 'expired';
        if (daysUntilExpiry === 0) return 'today';
        if (daysUntilExpiry <= 3) return 'expiring-soon';
        return 'expiring';
    };

    const handleClose = () => {
        // Save dismissal time to localStorage
        localStorage.setItem('notificationLastDismissed', new Date().toISOString());
        setVisible(false);
        setTimeout(() => {
            setVisible(false);
        }, 300);
    };

    if (loading) return null;
    if (!visible) return null;

    return (
        <div className={`expiry-notification-overlay ${visible ? 'visible' : ''}`}>
            <div className={`expiry-notification-popup ${visible ? 'show' : ''}`}>
                <div className="notification-header">
                    <div className="notification-icon">
                        <span className="icon-emoji">{"\u23f0"}</span>
                    </div>
                    <div className="notification-title">
                        <h3>Expiry Notifications</h3>
                        <p>Items that need your attention</p>
                    </div>
                    <button className="close-button" onClick={handleClose}>
                        {"\u2715"}
                    </button>
                </div>

                <div className="notification-content">
                    {expiredItems.length > 0 && (
                        <div className="notification-section expired">
                            <h4>
                                <span className="section-icon">{"\u26a0\ufe0f"}</span>
                                Already Expired ({expiredItems.length})
                            </h4>
                            <div className="items-list">
                                {expiredItems.map((item) => (
                                    <div key={item._id} className="notification-item expired-item">
                                        <div className="item-info">
                                            <span className="item-name">{item.name}</span>
                                            <span className="item-quantity">
                                                {item.quantity} {item.quantityUnit}
                                            </span>
                                        </div>
                                        <div className="item-expiry">
                                            <span className={`expiry-status ${getExpiryStatusColor(item.expiryDate)}`}>
                                                Expired {formatDate(item.expiryDate)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {expiringItems.length > 0 && (
                        <div className="notification-section expiring">
                            <h4>
                                <span className="section-icon">{"\ud83d\udd14"}</span>
                                Expiring Soon ({expiringItems.length})
                            </h4>
                            <div className="items-list">
                                {expiringItems.map((item) => (
                                    <div key={item._id} className="notification-item expiring-item">
                                        <div className="item-info">
                                            <span className="item-name">{item.name}</span>
                                            <span className="item-quantity">
                                                {item.quantity} {item.quantityUnit}
                                            </span>
                                        </div>
                                        <div className="item-expiry">
                                            <span className={`expiry-status ${getExpiryStatusColor(item.expiryDate)}`}>
                                                {formatDate(item.expiryDate)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {expiredItems.length === 0 && expiringItems.length === 0 && (
                        <div className="no-items">
                            <span className="no-items-icon">{"\u2705"}</span>
                            <p>All items are fresh! Great job managing your inventory.</p>
                        </div>
                    )}
                </div>

                <div className="notification-actions">
                    <button className="action-button primary" onClick={handleClose}>
                        Got it, thanks!
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExpiryNotification;
