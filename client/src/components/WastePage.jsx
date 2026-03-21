import React, { useState, useEffect } from 'react';
import './WastePage.css';

import API_BASE_URL from '../config';

const WastePage = () => {
  const [stats, setStats] = useState({ summary: { totalItems: 0, totalValue: 0 }, categories: [] });
  const userId = "65f1a2b3c4d5e6f7a8b9c0d1"; 

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/waste/analytics?userId=${userId}`);
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching waste stats:', error);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="waste-container">
      <h1>📉 Waste Analytics</h1>
      
      <div className="stats-cards">
        <div className="stat-card">
          <h3>Total Items Wasted</h3>
          <p className="stat-value">{stats.summary.totalItems}</p>
          <span className="stat-period">Last 30 Days</span>
        </div>
        <div className="stat-card highlight">
          <h3>Estimated Loss</h3>
          <p className="stat-value">${stats.summary.totalValue.toFixed(2)}</p>
          <span className="stat-period">Financial Impact</span>
        </div>
      </div>

      <div className="waste-breakdown">
        <h2>Breakdown by Category</h2>
        <div className="category-list">
          {stats.categories.map(cat => (
            <div key={cat._id} className="cat-stat-row">
              <span className="cat-name">{cat._id}</span>
              <div className="cat-bar-container">
                <div 
                  className="cat-bar" 
                  style={{ width: `${(cat.count / stats.summary.totalItems) * 100}%` }}
                ></div>
              </div>
              <span className="cat-count">{cat.count} items</span>
            </div>
          ))}
          {stats.categories.length === 0 && <p>No data yet. Keep up the good work of zero waste!</p>}
        </div>
      </div>
    </div>
  );
};

export default WastePage;
