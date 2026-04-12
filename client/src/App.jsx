import { Route, Routes, Navigate } from 'react-router-dom';
import './App.css';
import HomePage from './components/HomePage';
import ProductsPage from './components/ProductsPage';
import ShoppingPage from './components/ShoppingPage';
import RecipePage from './components/RecipePage';
import WastePage from './components/WastePage';
import CalorieTrackerPage from './components/CalorieTrackerPage';
import Navbar from './components/Navbar';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import { AuthProvider, useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  return children;
};

function AppContent() {
  console.log('App component rendered');
  return (
    <div className="App">
      <Navbar />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          <Route path="/products" element={
            <ProtectedRoute>
              <ProductsPage />
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
        </Routes>
      </div>
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
