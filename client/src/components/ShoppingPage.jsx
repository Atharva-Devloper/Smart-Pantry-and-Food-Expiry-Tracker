import React, { useState, useEffect } from 'react';
import './ShoppingPage.css';

import API_BASE_URL from '../config';

const ShoppingPage = () => {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', quantity: '1', priority: 'medium' });
  const [loading, setLoading] = useState(true);

  // For demo purposes, using a hardcoded userId. In a real app, this would come from auth.
  const userId = "65f1a2b3c4d5e6f7a8b9c0d1"; 

  const fetchItems = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/shopping?userId=${userId}`);
      const data = await response.json();
      setItems(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching shopping list:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const addItem = async (e) => {
    e.preventDefault();
    if (!newItem.name) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/shopping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newItem, userId }),
      });
      if (response.ok) {
        setNewItem({ name: '', quantity: '1', priority: 'medium' });
        fetchItems();
      }
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const togglePurchase = async (id, moveToPantry) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/shopping/${id}/purchase`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moveToPantry }),
      });
      if (response.ok) fetchItems();
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const deleteItem = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/api/shopping/${id}`, { method: 'DELETE' });
      fetchItems();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  if (loading) return <div className="loading">Loading Shopping List...</div>;

  return (
    <div className="shopping-container">
      <h1>🛒 Shopping List</h1>
      
      <form className="add-item-form" onSubmit={addItem}>
        <input 
          type="text" 
          placeholder="Item name..." 
          value={newItem.name}
          onChange={(e) => setNewItem({...newItem, name: e.target.value})}
        />
        <input 
          type="text" 
          placeholder="Qty" 
          className="qty-input"
          value={newItem.quantity}
          onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
        />
        <select 
          value={newItem.priority}
          onChange={(e) => setNewItem({...newItem, priority: e.target.value})}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button type="submit">Add</button>
      </form>

      <div className="shopping-list">
        {items.length === 0 ? (
          <p className="empty-msg">Your shopping list is empty.</p>
        ) : (
          items.map(item => (
            <div key={item._id} className={`shopping-item ${item.isPurchased ? 'purchased' : ''}`}>
              <div className="item-info">
                <span className={`priority-tag ${item.priority}`}>{item.priority}</span>
                <span className="item-name">{item.name}</span>
                <span className="item-qty">({item.quantity})</span>
              </div>
              <div className="item-actions">
                {!item.isPurchased ? (
                  <button onClick={() => togglePurchase(item._id, true)} className="buy-btn">Buy & Add to Pantry</button>
                ) : (
                  <button onClick={() => togglePurchase(item._id, false)} className="undo-btn">Undo</button>
                )}
                <button onClick={() => deleteItem(item._id)} className="delete-btn">×</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ShoppingPage;
