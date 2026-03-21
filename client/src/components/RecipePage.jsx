import React, { useState } from 'react';
import './RecipePage.css';

import API_BASE_URL from '../config';

const RecipePage = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const userId = "65f1a2b3c4d5e6f7a8b9c0d1"; 

  const getRecipes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/recipes/suggest?userId=${userId}`);
      const data = await response.json();
      setRecipes(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching recipes:', error);
      setLoading(false);
    }
  };

  return (
    <div className="recipe-container">
      <div className="recipe-header">
        <h1>👨‍🍳 AI Recipe Suggestions</h1>
        <p>Get creative with what's already in your pantry!</p>
        <button onClick={getRecipes} disabled={loading} className="generate-btn">
          {loading ? 'Thinking...' : 'Generate Recipe Ideas'}
        </button>
      </div>

      <div className="recipe-grid">
        {recipes.map((recipe, index) => (
          <div key={index} className="recipe-card">
            <h3>{recipe.title}</h3>
            <p className="recipe-desc">{recipe.description}</p>
            
            <div className="recipe-section">
              <h4>Missing Ingredients:</h4>
              <ul>
                {recipe.ingredientsNeeded?.map((ing, i) => (
                  <li key={i}>{ing}</li>
                ))}
              </ul>
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
          Click the button above to see what you can cook today!
        </div>
      )}
    </div>
  );
};

export default RecipePage;
