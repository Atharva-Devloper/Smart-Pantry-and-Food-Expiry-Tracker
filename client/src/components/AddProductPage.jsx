import { useNavigate } from 'react-router-dom';
import AddProductForm from './AddProductForm';
import { ArrowLeft } from 'lucide-react';
import '../styles/AddProductPage.css';

const AddProductPage = () => {
    const navigate = useNavigate();

    const handleProductAdded = () => {
        // Redirect to products page after successful addition
        setTimeout(() => {
            navigate('/products');
        }, 1500);
    };

    return (
        <div className="add-product-page">
            <header className="add-product-header">
                <button className="back-btn" onClick={() => navigate('/products')}>
                    <ArrowLeft size={20} /> Back to Inventory
                </button>
                <h1>➕ Add New Product</h1>
            </header>

            <main className="add-product-main">
                <div className="form-container">
                    <AddProductForm onProductAdded={handleProductAdded} />
                </div>
            </main>
        </div>
    );
};

export default AddProductPage;
