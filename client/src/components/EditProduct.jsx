import { useState } from 'react';
import '../styles/EditProduct.css';

const EditProduct = ({ product, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    quantity: product?.quantity || '',
    expiryDate: product?.expiryDate
      ? new Date(product.expiryDate).toISOString().split('T')[0]
      : '',
  });

  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch(
        `http://localhost:5000/products/${product._id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            quantity: parseInt(formData.quantity),
            expiryDate: formData.expiryDate,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessage('Product updated successfully!');
        setTimeout(() => {
          onSave(data);
        }, 1000);
      } else {
        const errorData = await response.json();
        setMessage('Error: ' + errorData.message);
      }
    } catch (error) {
      setMessage('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      onCancel();
    }
  };

  return (
    <div className="edit-modal">
      <div className="edit-form-container">
        <button
          className="close-button"
          onClick={handleCancel}
          disabled={isLoading}
        >
          ×
        </button>

        <h2 className="edit-title">Edit Product</h2>

        {message && (
          <div
            className={
              'message ' + (message.includes('Error') ? 'error' : 'success')
            }
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="edit-form-group">
            <label htmlFor="name" className="edit-label">
              Product Name:
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="edit-input"
              placeholder="Enter product name"
            />
          </div>

          <div className="edit-form-group">
            <label htmlFor="quantity" className="edit-label">
              Quantity:
            </label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              required
              min="1"
              className="edit-input"
              placeholder="Enter quantity"
            />
          </div>

          <div className="edit-form-group">
            <label htmlFor="expiryDate" className="edit-label">
              Expiry Date:
            </label>
            <input
              type="date"
              id="expiryDate"
              name="expiryDate"
              value={formData.expiryDate}
              onChange={handleChange}
              required
              className="edit-input"
            />
          </div>

          <div className="edit-buttons">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="edit-button cancel-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={
                'edit-button save-button ' + (isLoading ? 'loading' : '')
              }
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProduct;
