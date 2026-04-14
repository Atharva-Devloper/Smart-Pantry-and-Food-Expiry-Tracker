import { useEffect, useState } from 'react';
import API_BASE_URL from '../config';
import { useAuth } from '../context/AuthContext';
import '../styles/ShoppingPage.css';

const ShoppingPage = () => {
    const { user, token } = useAuth();
    const [items, setItems] = useState([]);
    const [newItem, setNewItem] = useState({
        name: '',
        quantity: '1',
        quantityUnit: 'units',
        category: 'other',
        priority: 'medium',
    });
    const [loading, setLoading] = useState(true);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');

    const fetchItems = async () => {
        if (!token) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/shopping`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            setItems(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching shopping list:', error);
            setError('Failed to load shopping list');
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchItems();
        }
    }, [token]);

    const addItem = async (e) => {
        e.preventDefault();
        if (!newItem.name) {
            setError('Please enter an item name');
            return;
        }

        if (!token) {
            setError('User not authenticated');
            return;
        }

        try {
            const parsedQty = Number(newItem.quantity);
            const response = await fetch(`${API_BASE_URL}/api/shopping`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...newItem,
                    quantity: Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : 1,
                }),
            });
            if (response.ok) {
                setNewItem({ name: '', quantity: '1', quantityUnit: 'units', category: 'other', priority: 'medium' });
                setSuccessMessage('✅ Item added to shopping list!');
                setError('');
                fetchItems();
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setError('Failed to add item');
            }
        } catch (error) {
            console.error('Error adding item:', error);
            setError('Error adding item');
        }
    };

    const togglePurchase = async (id, moveToPantry) => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/shopping/${id}/purchase`,
                {
                    method: 'PATCH',
                    headers: { 
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ moveToPantry }),
                }
            );
            if (response.ok) fetchItems();
        } catch (error) {
            console.error('Error updating item:', error);
        }
    };

    const deleteItem = async (id) => {
        try {
            await fetch(`${API_BASE_URL}/api/shopping/${id}`, { 
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            fetchItems();
        } catch (error) {
            console.error('Error deleting item:', error);
        }
    };

    if (loading) return <div className="loading">Loading Shopping List...</div>;

    return (
        <div className="shopping-page">
            <div className="shopping-header">
                <h1>🛒 Shopping List</h1>
                <p>Keep track of items you need to buy</p>
            </div>

            <div className="shopping-container">
                {successMessage && (
                    <div className="success-banner">{successMessage}</div>
                )}

                {error && <div className="error-banner">❌ {error}</div>}

                <div className="add-item-section">
                    <h2>Add New Item</h2>
                    <form className="add-item-form" onSubmit={addItem}>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="item-name">Item Name</label>
                                <input
                                    id="item-name"
                                    type="text"
                                    placeholder="e.g., Milk, Bread, Eggs..."
                                    value={newItem.name}
                                    onChange={(e) =>
                                        setNewItem({ ...newItem, name: e.target.value })
                                    }
                                    className="item-input"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="item-category">Category</label>
                                <select
                                    id="item-category"
                                    value={newItem.category}
                                    onChange={(e) =>
                                        setNewItem({ ...newItem, category: e.target.value })
                                    }
                                    className="priority-select"
                                >
                                    <option value="fruits">Fruits</option>
                                    <option value="vegetables">Vegetables</option>
                                    <option value="dairy">Dairy</option>
                                    <option value="meat">Meat</option>
                                    <option value="grains">Grains</option>
                                    <option value="snacks">Snacks</option>
                                    <option value="beverages">Beverages</option>
                                    <option value="condiments">Condiments</option>
                                    <option value="frozen">Frozen</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="item-qty">Quantity</label>
                                <input
                                    id="item-qty"
                                    type="text"
                                    placeholder="Qty"
                                    value={newItem.quantity}
                                    onChange={(e) =>
                                        setNewItem({ ...newItem, quantity: e.target.value })
                                    }
                                    className="qty-input"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="item-priority">Priority</label>
                                <select
                                    id="item-priority"
                                    value={newItem.priority}
                                    onChange={(e) =>
                                        setNewItem({ ...newItem, priority: e.target.value })
                                    }
                                    className="priority-select"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="item-unit">Unit</label>
                                <select
                                    id="item-unit"
                                    value={newItem.quantityUnit}
                                    onChange={(e) =>
                                        setNewItem({ ...newItem, quantityUnit: e.target.value })
                                    }
                                    className="priority-select"
                                >
                                    <option value="units">Units</option>
                                    <option value="g">Grams (g)</option>
                                    <option value="kg">Kilograms (kg)</option>
                                    <option value="ml">Milliliters (ml)</option>
                                    <option value="l">Liters (l)</option>
                                    <option value="oz">Ounces (oz)</option>
                                    <option value="lb">Pounds (lb)</option>
                                    <option value="cups">Cups</option>
                                    <option value="tbsp">Tablespoons (tbsp)</option>
                                    <option value="tsp">Teaspoons (tsp)</option>
                                    <option value="pack">Pack</option>
                                    <option value="bottle">Bottle</option>
                                    <option value="can">Can</option>
                                    <option value="box">Box</option>
                                </select>
                            </div>

                            <button type="submit" className="add-btn">
                                + Add Item
                            </button>
                        </div>
                    </form>
                </div>

                <div className="shopping-list-section">
                    <h2>Your Items ({items.length})</h2>
                    {items.length === 0 ? (
                        <div className="empty-shopping">
                            <div className="empty-icon">📋</div>
                            <p>Your shopping list is empty.</p>
                            <p className="empty-hint">Add items to get started!</p>
                        </div>
                    ) : (
                        <div className="shopping-list">
                            {items.map((item) => (
                                <div
                                    key={item._id}
                                    className={`shopping-item ${item.isPurchased ? 'purchased' : ''}`}
                                >
                                    <div className="item-info">
                                        <span className={`priority-tag ${item.priority}`}>
                                            {item.priority.charAt(0).toUpperCase() +
                                                item.priority.slice(1)}
                                        </span>
                                        <div className="item-details">
                                            <span className="item-name">{item.name}</span>
                                            <span className="item-qty">Qty: {item.quantity} {item.quantityUnit || 'units'}</span>
                                        </div>
                                    </div>
                                    <div className="item-actions">
                                        {!item.isPurchased ? (
                                            <button
                                                onClick={() => togglePurchase(item._id, true)}
                                                className="buy-btn"
                                                title="Mark as purchased and add to pantry"
                                            >
                                                ✓ Buy & Add
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => togglePurchase(item._id, false)}
                                                className="undo-btn"
                                                title="Mark as unpurchased"
                                            >
                                                ↶ Undo
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteItem(item._id)}
                                            className="delete-btn"
                                            title="Remove from list"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShoppingPage;
