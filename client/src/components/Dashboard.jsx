import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, Package, Users, AlertCircle, 
  ShoppingCart, TrendingUp, Calendar, Clock
} from 'lucide-react';
import API_BASE_URL from '../config';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setData(data);
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (err) {
      setError('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="error-container">
          <AlertCircle size={48} />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <LayoutDashboard size={32} />
          <h1>Dashboard</h1>
          <p>Welcome back, {user?.name?.split(' ')[0]}!</p>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <Package size={24} />
            </div>
            <div className="stat-info">
              <h3>{data?.stats?.totalProducts || 0}</h3>
              <p>Total Products</p>
            </div>
          </div>

          <div className="stat-card warning">
            <div className="stat-icon">
              <AlertCircle size={24} />
            </div>
            <div className="stat-info">
              <h3>{data?.stats?.expiredCount || 0}</h3>
              <p>Expired Items</p>
            </div>
          </div>

          <div className="stat-card info">
            <div className="stat-icon">
              <Clock size={24} />
            </div>
            <div className="stat-info">
              <h3>{data?.stats?.expiringSoonCount || 0}</h3>
              <p>Expiring Soon</p>
            </div>
          </div>

          <div className="stat-card success">
            <div className="stat-icon">
              <ShoppingCart size={24} />
            </div>
            <div className="stat-info">
              <h3>{data?.stats?.totalShoppingItems || 0}</h3>
              <p>Shopping Items</p>
            </div>
          </div>
        </div>

        {/* Family Section */}
        {data?.familyStats && (
          <div className="family-section">
            <div className="section-header">
              <Users size={24} />
              <h2>Family: {data.familyStats.name}</h2>
            </div>
            <div className="family-stats">
              <div className="family-stat">
                <span className="stat-value">{data.familyStats.memberCount}</span>
                <span className="stat-label">Members</span>
              </div>
              <div className="family-stat">
                <span className="stat-value">{data.familyStats.totalItems}</span>
                <span className="stat-label">Shared Items</span>
              </div>
            </div>
            {data?.familyMembers?.length > 0 && (
              <div className="family-members">
                <h3>Family Members</h3>
                <div className="members-list">
                  {data.familyMembers.map((member) => (
                    <div key={member.userId._id} className="member-item">
                      <div className="member-avatar">
                        {member.userId.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="member-info">
                        <span className="member-name">{member.userId.name}</span>
                        <span className="member-role">{member.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Items */}
        {data?.recentItems?.length > 0 && (
          <div className="recent-section">
            <div className="section-header">
              <Calendar size={24} />
              <h2>Recent Items</h2>
            </div>
            <div className="recent-list">
              {data.recentItems.map((item) => (
                <div key={item._id} className="recent-item">
                  <div className="item-info">
                    <span className="item-name">{item.name}</span>
                    <span className="item-category">{item.category}</span>
                  </div>
                  <span className={`item-status ${item.status}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin Stats */}
        {data?.adminStats && (
          <div className="admin-section">
            <div className="section-header">
              <TrendingUp size={24} />
              <h2>Admin Overview</h2>
            </div>
            <div className="admin-stats-grid">
              <div className="admin-stat">
                <span className="stat-value">{data.adminStats.totalUsers}</span>
                <span className="stat-label">Total Users</span>
              </div>
              <div className="admin-stat">
                <span className="stat-value">{data.adminStats.totalProducts}</span>
                <span className="stat-label">Total Products</span>
              </div>
              <div className="admin-stat">
                <span className="stat-value">{data.adminStats.totalFamilies}</span>
                <span className="stat-label">Total Families</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
