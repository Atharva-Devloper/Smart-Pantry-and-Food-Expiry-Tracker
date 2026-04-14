import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, ChefHat, Trash2, Users, LogOut, User, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/Navbar.css';

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
                            <Link to="/" className={isActive('/')}>
                                <LayoutDashboard size={18} /> Dashboard
                            </Link>
                        </li>
                        <li>
                            <Link to="/products" className={isActive('/products')}>
                                <Package size={18} /> Inventory
                            </Link>
                        </li>
                        <li>
                            <Link to="/add-product" className={isActive('/add-product')}>
                                <Plus size={18} /> Add Product
                            </Link>
                        </li>
                        <li>
                            <Link to="/shopping" className={isActive('/shopping')}>
                                <ShoppingCart size={18} /> Shopping
                            </Link>
                        </li>
                        <li>
                            <Link to="/recipes" className={isActive('/recipes')}>
                                <ChefHat size={18} /> Recipes
                            </Link>
                        </li>
                        <li>
                            <Link to="/waste" className={isActive('/waste')}>
                                <Trash2 size={18} /> Waste
                            </Link>
                        </li>
                        <li>
                            <Link to="/family" className={isActive('/family')}>
                                <Users size={18} /> Family
                            </Link>
                        </li>
                        <li>
                            <Link to="/calories" className={isActive('/calories')}>Calorie Tracker</Link>
                        </li>
                        <li className="user-nav">
                            <span className="user-name"><User size={16} /> {user.name.split(' ')[0]}</span>
                            <button onClick={handleLogout} className="logout-btn">
                                <LogOut size={16} /> Logout
                            </button>
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
