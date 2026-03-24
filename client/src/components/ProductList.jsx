import { useState } from 'react';
import API_BASE_URL from '../config';
import { useAuth } from '../context/AuthContext';
import '../styles/DeleteProduct.css';
import '../styles/ProductList.css';
import EditProduct from './EditProduct';

const ProductList = ({ products, onProductUpdated, onProductDeleted }) => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showAddToShoppingModal, setShowAddToShoppingModal] = useState(null);

  const handleEdit = (product) => {
    setEditingProduct(product);
  };

  const handleUpdate = async (updatedProduct) => {
    try {
      console.log('📝 Updating product:', updatedProduct._id);

      const response = await fetch(
        `${API_BASE_URL}/products/${updatedProduct._id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify(updatedProduct),
        }
      );

      console.log('📥 Update response:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Product updated successfully');
        setEditingProduct(null);
        if (onProductUpdated) {
          onProductUpdated(data);
        }
      } else {
        const errorData = await response.json();
        setError('❌ Failed to update product: ' + errorData.message);
      }
    } catch (error) {
      console.error('🔴 Update error:', error);
      setError('❌ Error updating product: ' + error.message);
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      console.log('🗑️  Deleting product:', productId);
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      console.log('📥 Delete response:', response.status);

      if (response.ok) {
        console.log('✅ Product deleted successfully');
        if (onProductDeleted) {
          onProductDeleted();
        }
      } else {
        const errorData = await response.json();
        setError('❌ Failed to delete product: ' + errorData.message);
      }
    } catch (error) {
      console.error('🔴 Delete error:', error);
      setError('❌ Error deleting product: ' + error.message);
    } finally {
      setLoading(false);
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

  const handleAddToShopping = async (quantity, priority) => {
    if (!showAddToShoppingModal) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/shopping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: showAddToShoppingModal.name,
          quantity: quantity || '1',
          priority: priority || 'medium',
          userId: user?._id,
          category: showAddToShoppingModal.category,
        }),
      });

      if (response.ok) {
        setSuccessMessage(
          `✅ "${showAddToShoppingModal.name}" added to shopping list!`
        );
        setShowAddToShoppingModal(null);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError('Failed to add to shopping list');
      }
    } catch (error) {
      console.error('Error adding to shopping list:', error);
      setError('Error adding to shopping list');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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

      {successMessage && <div className="success-alert">{successMessage}</div>}

      {error && <div className="error-alert">{error}</div>}

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
                    <span className="detail-value">
                      {formatDate(product.expiryDate)}
                    </span>
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
                    onClick={() => setShowAddToShoppingModal(product)}
                    className="shopping-button"
                    title="Add to shopping list"
                  >
                    🛒 Add to Shopping
                  </button>
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

      {showAddToShoppingModal && (
        <AddToShoppingModal
          product={showAddToShoppingModal}
          onAdd={handleAddToShopping}
          onClose={() => setShowAddToShoppingModal(null)}
        />
      )}
    </div>
  );
};

const AddToShoppingModal = ({ product, onAdd, onClose }) => {
  const [quantity, setQuantity] = useState(product.quantity || '1');
  const [priority, setPriority] = useState('medium');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add to Shopping List</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="product-name-display">{product.name}</p>

          <div className="modal-form-group">
            <label htmlFor="shopping-qty">Quantity</label>
            <input
              id="shopping-qty"
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
            />
          </div>

          <div className="modal-form-group">
            <label htmlFor="shopping-priority">Priority</label>
            <select
              id="shopping-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="add-shopping-btn"
            onClick={() => onAdd(quantity, priority)}
          >
            Add to Shopping List
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductList;
