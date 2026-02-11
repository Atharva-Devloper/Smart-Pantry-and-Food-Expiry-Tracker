import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

const HomePage = () => {
  return (
    <div className="home-page">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Smart Pantry & Food Expiry Tracker</h1>
          <p className="hero-subtitle">
            Never waste food again! Track your pantry items, monitor expiry dates, and manage your kitchen inventory efficiently.
          </p>
          <div className="hero-buttons">
            <Link to="/products" className="btn btn-primary">
              View Products
            </Link>
            <Link to="/products" className="btn btn-secondary">
              Add New Item
            </Link>
          </div>
        </div>
        <div className="hero-image">
          <div className="pantry-icon">
            🥦🥕🍎🥛🍞🥚
          </div>
        </div>
      </div>

      <div className="features-section">
        <h2 className="features-title">Why Choose Smart Pantry?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📅</div>
            <h3>Expiry Tracking</h3>
            <p>Never miss an expiry date again with our intelligent tracking system</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Inventory Management</h3>
            <p>Keep track of what you have and what you need to buy</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔄</div>
            <h3>Real-time Updates</h3>
            <p>Instant updates when you add, edit, or remove items</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h3>Mobile Friendly</h3>
            <p>Access your pantry from anywhere, on any device</p>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <div className="stats-container">
          <div className="stat-item">
            <div className="stat-number">0</div>
            <div className="stat-label">Total Items</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">0</div>
            <div className="stat-label">Expiring Soon</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">0</div>
            <div className="stat-label">Categories</div>
          </div>
        </div>
      </div>

      <div className="cta-section">
        <h2>Ready to Organize Your Pantry?</h2>
        <p>Start tracking your food items today and reduce waste significantly.</p>
        <Link to="/products" className="btn btn-primary btn-large">
          Get Started Now
        </Link>
      </div>
    </div>
  );
};

export default HomePage;
