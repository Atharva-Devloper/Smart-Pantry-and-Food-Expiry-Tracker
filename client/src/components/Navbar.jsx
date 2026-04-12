import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">🍎 Smart Pantry</Link>
      </div>
      <ul className="navbar-links">
        {user ? (
          <>
            <li>
              <Link to="/products" className={isActive('/products')}>Inventory</Link>
            </li>
            <li>
              <Link to="/shopping" className={isActive('/shopping')}>Shopping List</Link>
            </li>
            <li>
              <Link to="/recipes" className={isActive('/recipes')}>AI Recipes</Link>
            </li>
            <li>
              <Link to="/waste" className={isActive('/waste')}>Waste Tracker</Link>
            </li>
            <li>
              <Link to="/calories" className={isActive('/calories')}>Calorie Tracker</Link>
            </li>
            <li className="user-nav">
              <span className="user-name">Hi, {user.name.split(' ')[0]}</span>
              <button onClick={handleLogout} className="logout-btn">Logout</button>
            </li>
          </>
        ) : (
          <>
            <li>
              <Link to="/login" className={isActive('/login')}>Login</Link>
            </li>
            <li>
              <Link to="/register" className={isActive('/register')} id="register-nav-btn">Get Started</Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
