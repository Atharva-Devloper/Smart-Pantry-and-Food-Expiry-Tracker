import { useState, useEffect } from 'react';
import EditProduct from './EditProduct';
import '../styles/ProductList.css';
import '../styles/DeleteProduct.css';

const ProductList = ({ products, onProductUpdated, onProductDeleted }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);

  const handleEdit = (product) => {
    setEditingProduct(product);
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/products/${productId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        if (onProductDeleted) {
          onProductDeleted();
        }
      } else {
        const errorData = await response.json();
        setError('Failed to delete product: ' + errorData.message);
      }
    } catch (error) {
      setError('Error deleting product: ' + error.message);
    }
  };

  const handleSave = (updatedProduct) => {
    setEditingProduct(null);
    if (onProductUpdated) {
      onProductUpdated();
    }
  };

  const handleCancel = () => {
    setEditingProduct(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return { class: 'unknown', text: 'Unknown' };
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { class: 'expired', text: 'Expired' };
    } else if (diffDays <= 3) {
      return { class: 'expiring-soon', text: `Expires in ${diffDays} days` };
    } else {
      return { class: 'fresh', text: 'Fresh' };
    }
  };

  if (loading) {
    return (
      <div className="product-list-container">
        <h2 className="list-title">Pantry Products</h2>
        <div className="loading">Loading products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="product-list-container">
        <h2 className="list-title">Pantry Products</h2>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="product-list-container">
      <h2 className="list-title">Pantry Products</h2>
      
      {products.length === 0 ? (
        <div className="empty-list">
          <div className="empty-icon">📦</div>
          <h3>No products found</h3>
          <p>Add some products to get started with your pantry management!</p>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((product) => {
            const expiryStatus = getExpiryStatus(product.expiryDate);
            
            return (
              <div key={product._id} className="product-card">
                <div className="product-header">
                  <h3 className="product-name">{product.name}</h3>
                  <span className={`status-badge ${expiryStatus.class}`}>
                    {expiryStatus.text}
                  </span>
                </div>
                
                <div className="product-details">
                  <div className="detail-item">
                    <span className="detail-label">Quantity:</span>
                    <span className="detail-value">{product.quantity}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">Expiry:</span>
                    <span className="detail-value">{formatDate(product.expiryDate)}</span>
                  </div>
                  
                  {product.category && (
                    <div className="detail-item">
                      <span className="detail-label">Category:</span>
                      <span className="detail-value">{product.category}</span>
                    </div>
                  )}
                  
                  {product.location && (
                    <div className="detail-item">
                      <span className="detail-label">Location:</span>
                      <span className="detail-value">{product.location}</span>
                    </div>
                  )}
                </div>
                
                <div className="product-actions">
                  <button 
                    onClick={() => handleEdit(product)}
                    className="edit-button"
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(product._id)}
                    className="delete-button"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingProduct && (
        <EditProduct
          product={editingProduct}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};

export default ProductList;
