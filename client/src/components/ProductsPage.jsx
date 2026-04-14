import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductList from './ProductList';
import { SkeletonStats } from './SkeletonLoader';
import '../styles/ProductsPage.css';
import { Plus } from 'lucide-react';

import API_BASE_URL from '../config';
import { useAuth } from '../context/AuthContext';

const ProductsPage = () => {
    const { token } = useAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

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

    // Get unique categories
    const categories = ['all', ...new Set(products.map(p => p.category || 'other'))];

    // Filter products by category
    const filteredProducts = selectedCategory === 'all' 
        ? products 
        : products.filter(p => (p.category || 'other') === selectedCategory);

    return (
        <div className="products-page">
            <header className="products-header">
                <div className="header-content">
                    <div className="header-top">
                        <div>
                            <h1>📦 Inventory</h1>
                            <p className="header-subtitle">View and manage your pantry items</p>
                        </div>
                        <div className="header-buttons">
                            <Link 
                                to="/add-product"
                                className="btn-add-product-header"
                                title="Add new product"
                            >
                                <Plus size={18} /> Add Product
                            </Link>
                        </div>
                    </div>
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
                        Total Products: {filteredProducts.length}
                    </div>
                    
                    {/* Category Filter */}
                    <div className="category-filter">
                        <label>Filter by Category:</label>
                        <select 
                            value={selectedCategory} 
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="category-select"
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>
                                    {cat.charAt(0).toUpperCase() + cat.slice(1).replace(/([A-Z])/g, ' $1')}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="products-section">
                    {loading ? (
                        <>
                            <SkeletonStats />
                            <div className="skeleton-loading-container">
                                <div className="skeleton-loading-spinner"></div>
                            </div>
                        </>
                    ) : (
                        <ProductList
                            products={filteredProducts}
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
