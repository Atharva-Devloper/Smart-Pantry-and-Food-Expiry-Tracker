import { Route, Routes, Navigate } from 'react-router-dom';
import './App.css';
import HomePage from './components/HomePage';
import ProductsPage from './components/ProductsPage';
import AddProductPage from './components/AddProductPage';
import ShoppingPage from './components/ShoppingPage';
import RecipePage from './components/RecipePage';
import WastePage from './components/WastePage';
import CalorieTrackerPage from './components/CalorieTrackerPage';
import Dashboard from './components/Dashboard';
import Family from './components/Family';
import AcceptInvitation from './components/AcceptInvitation';
import Navbar from './components/Navbar';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import ExpiryNotification from './components/ExpiryNotification';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useState } from 'react';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) return <div>Loading...</div>;
    if (!user) return <Navigate to="/login" />;

    return children;
};

function AppContent() {
    const { user } = useAuth();

    console.log('App component rendered');

    return (
        <div className="App">
            <Navbar />
            <div className="main-content">
                <Routes>
                    <Route path="/" element={user ? <Navigate to="/dashboard" /> : <HomePage />} />
                    <Route path="/dashboard" element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    } />
                    <Route path="/home" element={<HomePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    <Route path="/products" element={
                        <ProtectedRoute>
                            <ProductsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/add-product" element={
                        <ProtectedRoute>
                            <AddProductPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/shopping" element={
                        <ProtectedRoute>
                            <ShoppingPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/recipes" element={
                        <ProtectedRoute>
                            <RecipePage />
                        </ProtectedRoute>
                    } />
                    <Route path="/waste" element={
                        <ProtectedRoute>
                            <WastePage />
                        </ProtectedRoute>
                    } />
                    <Route path="/calories" element={
                        <ProtectedRoute>
                            <CalorieTrackerPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/family" element={
                        <ProtectedRoute>
                            <Family />
                        </ProtectedRoute>
                    } />
                    <Route path="/family/accept-invitation/:token" element={
                        <ProtectedRoute>
                            <AcceptInvitation />
                        </ProtectedRoute>
                    } />
                </Routes>
            </div>

            {/* Show expiry notification for authenticated users */}
            {user && <ExpiryNotification user={user} />}
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;
