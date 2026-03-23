import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AddProductForm from './AddProductForm';
import ProductList from './ProductList';
import './ProductsPage.css';

import API_BASE_URL from '../config';
import { useAuth } from '../context/AuthContext';

const ProductsPage = () => {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Test backend connection
  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        const data = await response.json();
        console.log('Backend connected:', data);
      } catch (error) {
        console.error('Backend connection failed:', error);
        setError('Failed to connect to backend server');
      }
    };

    testConnection();
  }, []);

  // Fetch products from backend
  const fetchProducts = async () => {
    try {
      setLoading(true);
      if (!token) {
        setError('Please log in first');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/products`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('📥 Fetch products response:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Fetched ${data.length} products for logged-in user`);
        setProducts(data);
        setError('');
      } else {
        console.error('Failed to fetch products:', response.status);
        setError('Failed to fetch products');
      }
    } catch (error) {
      console.error('🔴 Fetch error:', error);
      setError('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProducts();
    }
  }, [token]);

  const handleProductAdded = () => {
    fetchProducts(); // Refresh product list after adding
  };

  const handleProductUpdated = () => {
    fetchProducts(); // Refresh product list after updating
  };

  const handleProductDeleted = () => {
    fetchProducts(); // Refresh product list after deleting
  };

  return (
    <div className="products-page">
      <header className="products-header">
        <div className="header-content">
          <Link to="/" className="back-link">
            ← Back to Home
          </Link>
          <h1>Product Management</h1>
          <div className="connection-status">
            {error ? (
              <div className="error-message">{error}</div>
            ) : (
              <div className="success-message">✓ Backend Connected</div>
            )}
          </div>
        </div>
      </header>

      <main className="products-main">
        <div className="controls">
          <div className="product-count">Total Products: {products.length}</div>
        </div>

        <div className="add-form-section">
          <AddProductForm onProductAdded={handleProductAdded} />
        </div>

        <div className="products-section">
          {loading ? (
            <div className="loading">Loading products...</div>
          ) : (
            <ProductList
              products={products}
              onProductUpdated={handleProductUpdated}
              onProductDeleted={handleProductDeleted}
            />
          )}
        </div>
      </main>

      <footer className="products-footer">
        <p>Smart Pantry & Food Expiry Tracker © 2024</p>
      </footer>
    </div>
  );
};

export default ProductsPage;
