import { useState } from 'react';
import '../styles/AddProductForm.css';
import API_BASE_URL from '../config';

const AddProductForm = ({ onProductAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    expiryDate: '',
    category: 'other',
    location: 'pantry',
    notes: ''
  });

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity),
          userId: '507f1f77bcf86cd799439011'
        })
      });

      if (response.ok) {
        setSuccess('Product added successfully!');
        setFormData({
          name: '',
          quantity: '',
          expiryDate: '',
          category: 'other',
          location: 'pantry',
          notes: ''
        });
        // Call parent callback to refresh product list
        if (onProductAdded) {
          onProductAdded();
        }
      } else {
        const errorData = await response.json();
        setError('Failed to add product: ' + errorData.message);
      }
    } catch (error) {
      setError('Error adding product: ' + error.message);
    }
  };

  return (
    <div className="add-product-form">
      <h2>Add New Product</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">📦 Product Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Organic Apples, Whole Milk, Chicken Breast"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="quantity">🔢 Quantity</label>
          <input
            type="number"
            id="quantity"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            min="1"
            placeholder="e.g., 6, 1, 500"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="expiryDate">📅 Expiry Date</label>
          <input
            type="date"
            id="expiryDate"
            name="expiryDate"
            value={formData.expiryDate}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="category">🍎 Food Category</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
          >
            <option value="fruits">🍎 Fresh Fruits</option>
            <option value="vegetables">🥬 Fresh Vegetables</option>
            <option value="dairy">🥛 Dairy Products</option>
            <option value="meat">🥩 Meat & Poultry</option>
            <option value="seafood">🐟 Seafood</option>
            <option value="grains">🌾 Grains & Pasta</option>
            <option value="snacks">🍪 Snacks & Chips</option>
            <option value="beverages">🥤 Beverages</option>
            <option value="condiments">🧂 Condiments & Spices</option>
            <option value="frozen">🧊 Frozen Foods</option>
            <option value="baking">🧁 Baking Supplies</option>
            <option value="canned">🥫 Canned Goods</option>
            <option value="other">📦 Other Items</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="location">Storage Location</label>
          <select
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
          >
            <option value="fridge">Refrigerator</option>
            <option value="freezer">Freezer</option>
            <option value="pantry">Pantry</option>
            <option value="cupboard">Kitchen Cupboard</option>
            <option value="cabinet">Food Cabinet</option>
            <option value="shelf">Kitchen Shelf</option>
            <option value="counter">Kitchen Counter</option>
            <option value="other">Other Location</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="notes">📝 Notes (Optional)</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="3"
            placeholder="e.g., Buy on sale, check for freshness, use for recipe..."
          />
        </div>

        <button type="submit" className="submit-btn">Add Product</button>
      </form>

      {success && <div className="success-message">{success}</div>}
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default AddProductForm;