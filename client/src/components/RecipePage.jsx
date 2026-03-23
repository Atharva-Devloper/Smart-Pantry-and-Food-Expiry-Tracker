import { useState } from 'react';
import API_BASE_URL from '../config';
import { useAuth } from '../context/AuthContext';
import './RecipePage.css';

const RecipePage = () => {
  const { token, user } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getRecipes = async () => {
    if (!token) {
      setError('Please log in to get recipe suggestions');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🍳 Requesting recipes for user:', user?.name);
      const response = await fetch(`${API_BASE_URL}/api/recipes/suggest`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch recipes: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📦 Received recipes:', data);
      setRecipes(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching recipes:', error);
      setError('Failed to generate recipes. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="recipe-container">
      <div className="recipe-header">
        <h1>👨‍🍳 AI Recipe Suggestions</h1>
        <p>Get creative with what's already in your pantry!</p>
        <button
          onClick={getRecipes}
          disabled={loading || !token}
          className="generate-btn"
        >
          {!token
            ? 'Log in to Generate'
            : loading
              ? 'Thinking...'
              : 'Generate Recipe Ideas'}
        </button>
      </div>

      {error && <div className="error-message">❌ {error}</div>}

      <div className="recipe-grid">
        {recipes.map((recipe, index) => (
          <div key={index} className="recipe-card">
            <h3>{recipe.title}</h3>
            <p className="recipe-desc">{recipe.description}</p>

            <div className="recipe-section">
              <h4>Ingredients Needed:</h4>
              {recipe.ingredientsNeeded &&
              recipe.ingredientsNeeded.length > 0 ? (
                <ul>
                  {recipe.ingredientsNeeded.map((ing, i) => (
                    <li key={i}>{ing}</li>
                  ))}
                </ul>
              ) : (
                <p className="no-items">You have everything you need!</p>
              )}
            </div>

            <div className="recipe-section">
              <h4>Instructions:</h4>
              <ol>
                {recipe.instructions?.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          </div>
        ))}
      </div>

      {!loading && recipes.length === 0 && (
        <div className="recipe-placeholder">
          👉 Click the button above to see what you can cook today with your
          pantry items!
        </div>
      )}
    </div>
  );
};

export default RecipePage;
