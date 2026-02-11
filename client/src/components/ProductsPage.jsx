import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AddProductForm from './AddProductForm';
import ProductList from './ProductList';
import './ProductsPage.css';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Test backend connection
  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/health');
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
      const response = await fetch('http://localhost:5000/products');
      
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
        setError('');
      } else {
        setError('Failed to fetch products');
      }
    } catch (error) {
      setError('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

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
          <div className="product-count">
            Total Products: {products.length}
          </div>
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
