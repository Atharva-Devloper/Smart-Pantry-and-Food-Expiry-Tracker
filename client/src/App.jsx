import { Route, Routes } from 'react-router-dom';
import './App.css';
import HomePage from './components/HomePage';
import ProductsPage from './components/ProductsPage';

function App() {
  console.log('App component rendered');
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
      </Routes>
    </div>
  );
}

export default App;
