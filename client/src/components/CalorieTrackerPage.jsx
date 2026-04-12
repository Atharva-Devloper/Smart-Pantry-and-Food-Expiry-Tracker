import React, { useState, useEffect } from 'react';
import './CalorieTrackerPage.css';
import API_BASE_URL from '../config';

const CalorieTrackerPage = () => {
  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState('today');
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [newMeal, setNewMeal] = useState({
    type: 'breakfast',
    items: []
  });
  const [foodSearchResults, setFoodSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [selectedFoodIndex, setSelectedFoodIndex] = useState(null);
  const [pantryItems, setPantryItems] = useState([]);

  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
  const dailyGoal = 2000;

  useEffect(() => {
    fetchTodayData();
    fetchPantryItems();
  }, []);

  const fetchTodayData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/calories/today`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTodayData(data);
      }
    } catch (error) {
      console.error('Error fetching today\'s data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDateData = async (date) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/calories/date/${date}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTodayData(data);
      } else {
        // If no data exists for this date, create empty structure
        setTodayData({
          date: date,
          meals: [],
          totalDailyCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
          totalFiber: 0,
          totalSugar: 0,
          totalSodium: 0,
          waterIntake: 0,
          notes: ''
        });
      }
    } catch (error) {
      console.error('Error fetching date data:', error);
      // Set empty state on error
      setTodayData({
        date: date,
        meals: [],
        totalDailyCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        totalFiber: 0,
        totalSugar: 0,
        totalSodium: 0,
        waterIntake: 0,
        notes: ''
      });
    }
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    fetchDateData(date);
    setActiveTab('meals'); // Switch to meals tab when date changes
  };

  const addMeal = async () => {
    if (newMeal.items.length === 0) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/calories/meal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date: selectedDate,
          mealType: newMeal.type,
          items: newMeal.items
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTodayData(data);
        setNewMeal({ type: 'breakfast', items: [] });
        setShowAddMeal(false);
      }
    } catch (error) {
      console.error('Error adding meal:', error);
    }
  };

  const addFoodItem = () => {
    setNewMeal(prev => ({
      ...prev,
      items: [...prev.items, {
        name: '',
        quantity: 1,
        unit: 'pieces'
      }]
    }));
  };

  const updateFoodItem = (index, field, value) => {
    setNewMeal(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const searchFoods = async (query) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/calories/search-foods?query=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const results = await response.json();
        setFoodSearchResults(results);
      }
    } catch (error) {
      console.error('Error searching foods:', error);
    }
  };

  const fetchPantryItems = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/calories/pantry-items`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const items = await response.json();
        setPantryItems(items);
      }
    } catch (error) {
      console.error('Error fetching pantry items:', error);
    }
  };

  const selectFood = (food, itemIndex) => {
    const updatedItem = {
      ...newMeal.items[itemIndex],
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      fiber: food.fiber,
      sugar: food.sugar,
      sodium: food.sodium,
      servingSize: food.servingSize,
      servingUnit: food.servingUnit
    };

    setNewMeal(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === itemIndex ? updatedItem : item
      )
    }));

    setFoodSearchResults([]);
    setSearchQuery('');
    setShowFoodSearch(false);
    setSelectedFoodIndex(null);
  };

  const selectPantryItem = (pantryItem) => {
    const newItem = {
      name: pantryItem.name,
      quantity: 1,
      unit: pantryItem.unit,
      calories: pantryItem.nutrition?.calories || 0,
      protein: pantryItem.nutrition?.protein || 0,
      carbs: pantryItem.nutrition?.carbs || 0,
      fat: pantryItem.nutrition?.fat || 0,
      fiber: pantryItem.nutrition?.fiber || 0,
      sugar: pantryItem.nutrition?.sugar || 0,
      sodium: pantryItem.nutrition?.sodium || 0,
      pantryItemId: pantryItem._id,
      servingSize: pantryItem.nutrition?.servingSize || 100,
      servingUnit: pantryItem.nutrition?.servingUnit || 'grams'
    };

    setNewMeal(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const calculateMealCalories = () => {
    return newMeal.items.reduce((total, item) => {
      if (item.calories && item.quantity) {
        const multiplier = item.quantity / (item.servingSize || 1);
        return total + (item.calories * multiplier);
      }
      return total;
    }, 0);
  };

  const getMealNutrition = () => {
    return newMeal.items.reduce((totals, item) => {
      if (item.quantity && item.servingSize) {
        const multiplier = item.quantity / item.servingSize;
        return {
          calories: totals.calories + (item.calories * multiplier),
          protein: totals.protein + (item.protein * multiplier),
          carbs: totals.carbs + (item.carbs * multiplier),
          fat: totals.fat + (item.fat * multiplier),
          fiber: totals.fiber + (item.fiber * multiplier),
          sugar: totals.sugar + (item.sugar * multiplier),
          sodium: totals.sodium + (item.sodium * multiplier)
        };
      }
      return totals;
    }, {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0
    });
  };

  const removeFoodItem = (index) => {
    setNewMeal(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const deleteMealItem = async (date, mealType, itemIndex) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/calories/meal/${encodeURIComponent(date)}/${mealType}/${itemIndex}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTodayData(data);
      }
    } catch (error) {
      console.error('Error deleting meal item:', error);
    }
  };

  const updateWaterIntake = async (waterIntake) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/calories/water`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date: selectedDate,
          waterIntake
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTodayData(prev => ({ ...prev, waterIntake }));
      }
    } catch (error) {
      console.error('Error updating water intake:', error);
    }
  };

  const getCaloriePercentage = () => {
    if (!todayData) return 0;
    return Math.round((todayData.totalDailyCalories / dailyGoal) * 100);
  };

  const getCalorieColor = () => {
    const percentage = getCaloriePercentage();
    if (percentage < 80) return '#10b981'; // green
    if (percentage < 100) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  if (loading) {
    return <div className="loading">Loading calorie data...</div>;
  }

  return (
    <div className="calorie-tracker">
      <div className="tracker-header">
        <h1>Calorie Tracker</h1>
        <div className="date-selector">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="date-input"
          />
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          Daily Overview
        </button>
        <button
          className={`tab ${activeTab === 'meals' ? 'active' : ''}`}
          onClick={() => setActiveTab('meals')}
        >
          Meals
        </button>
        <button
          className={`tab ${activeTab === 'nutrition' ? 'active' : ''}`}
          onClick={() => setActiveTab('nutrition')}
        >
          Nutrition
        </button>
      </div>

      {activeTab === 'today' && todayData && (
        <div className="daily-overview">
          <div className="calorie-circle">
            <div className="circle-progress">
              <svg width="200" height="200">
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke={getCalorieColor()}
                  strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 80}`}
                  strokeDashoffset={`${2 * Math.PI * 80 * (1 - getCaloriePercentage() / 100)}`}
                  transform="rotate(-90 100 100)"
                  className="progress-circle"
                />
              </svg>
              <div className="calorie-text">
                <div className="calories-current">{todayData.totalDailyCalories}</div>
                <div className="calories-goal">of: {dailyGoal} cal</div>
                <div className="calories-percentage">{getCaloriePercentage()}%</div>
              </div>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="nutrition-label">Protein:</div>
              <div className="nutrition-value">{todayData.totalProtein}g</div>
            </div>
            <div className="stat-card">
              <div className="nutrition-label">Carbs:</div>
              <div className="nutrition-value">{todayData.totalCarbs}g</div>
            </div>
            <div className="stat-card">
              <div className="nutrition-label">Fat:</div>
              <div className="nutrition-value">{todayData.totalFat}g</div>
            </div>
            <div className="stat-card">
              <div className="nutrition-label">Fiber:</div>
              <div className="nutrition-value">{todayData.totalFiber}g</div>
            </div>
            <div className="stat-card">
              <div className="nutrition-label">Sugar:</div>
              <div className="nutrition-value">{todayData.totalSugar}g</div>
            </div>
            <div className="stat-card">
              <div className="nutrition-label">Sodium:</div>
              <div className="nutrition-value">{todayData.totalSodium}mg</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'meals' && todayData && (
        <div className="meals-section">
          <div className="meal-header">
            <h2>Meals for {new Date(selectedDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</h2>
            <button
              className="add-meal-btn"
              onClick={() => setShowAddMeal(true)}
            >
              + Add Meal
            </button>
          </div>

          {todayData.meals.length === 0 ? (
            <div className="no-meals">
              <div className="no-meals-icon">🍽</div>
              <h3>No meals recorded</h3>
              <p>Start tracking your meals by clicking "Add Meal" above.</p>
            </div>
          ) : (
            todayData.meals.map((meal, index) => (
              <div key={index} className="meal-card">
                <div className="meal-header">
                  <h3 className="meal-type">{meal.type.charAt(0).toUpperCase() + meal.type.slice(1)}</h3>
                  <div className="meal-stats">
                    <span className="meal-calories">{meal.totalCalories} calories</span>
                    <div className="meal-macros">
                      <span className="macro-badge">P: {Math.round(meal.items.reduce((sum, item) => sum + item.protein, 0))}g</span>
                      <span className="macro-badge">C: {Math.round(meal.items.reduce((sum, item) => sum + item.carbs, 0))}g</span>
                      <span className="macro-badge">F: {Math.round(meal.items.reduce((sum, item) => sum + item.fat, 0))}g</span>
                    </div>
                  </div>
                </div>
                <div className="meal-items">
                  {meal.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="food-item">
                      <div className="food-main">
                        <span className="food-name">{item.name}</span>
                        <span className="food-quantity">{item.quantity} {item.unit}</span>
                        <span className="food-calories">{item.calories} cal</span>
                      </div>
                      {item.originalQuantity && (
                        <div className="consumed-info">
                          <span className="consumed-quantity">
                            Consumed: {item.quantity} {item.unit} from {item.originalQuantity} {item.originalUnit}
                          </span>
                        </div>
                      )}
                      <div className="food-nutrition-details">
                        <span className="nutrition-detail">Protein: {item.protein}g</span>
                        <span className="nutrition-detail">Carbs: {item.carbs}g</span>
                        <span className="nutrition-detail">Fat: {item.fat}g</span>
                      </div>
                      <button
                        onClick={() => deleteMealItem(selectedDate, meal.type, itemIndex)}
                        className="delete-item-btn"
                        title="Delete this food item"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          {showAddMeal && (
            <div className="add-meal-modal">
              <div className="modal-content">
                <h3>Add New Meal for {selectedDate}</h3>
                <select
                  value={newMeal.type}
                  onChange={(e) => setNewMeal(prev => ({ ...prev, type: e.target.value }))}
                  className="meal-type-select"
                >
                  {mealTypes.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>

                <div className="pantry-items-section">
                  <h4>Select from Pantry:</h4>
                  <div className="pantry-items-grid">
                    {pantryItems.map((pantryItem) => (
                      <div key={pantryItem._id} className="pantry-item-card">
                        <div className="pantry-item-info">
                          <span className="pantry-item-name">{pantryItem.name}</span>
                          <span className="pantry-item-quantity">{pantryItem.quantity} {pantryItem.unit}</span>
                        </div>
                        <button
                          onClick={() => selectPantryItem(pantryItem)}
                          className="select-pantry-btn"
                        >
                          Use
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="meal-nutrition-preview">
                  <div className="nutrition-summary">
                    <span className="total-calories">Total: {Math.round(calculateMealCalories())} cal</span>
                    <div className="nutrition-macros-mini">
                      <span>P: {Math.round(getMealNutrition().protein)}g</span>
                      <span>C: {Math.round(getMealNutrition().carbs)}g</span>
                      <span>F: {Math.round(getMealNutrition().fat)}g</span>
                    </div>
                  </div>
                </div>

                <div className="food-items">
                  {newMeal.items.map((item, index) => (
                    <div key={index} className="food-item-input">
                      <div className="food-search-container">
                        <input
                          type="text"
                          placeholder="Search food or enter custom name"
                          value={item.name}
                          onChange={(e) => {
                            updateFoodItem(index, 'name', e.target.value);
                            if (e.target.value.length > 1) {
                              searchFoods(e.target.value);
                              setSelectedFoodIndex(index);
                              setShowFoodSearch(true);
                            } else {
                              setFoodSearchResults([]);
                              setShowFoodSearch(false);
                            }
                          }}
                          className="food-name-input"
                          onFocus={() => {
                            setSelectedFoodIndex(index);
                            if (item.name.length > 1) {
                              searchFoods(item.name);
                              setShowFoodSearch(true);
                            }
                          }}
                        />
                        
                        {showFoodSearch && selectedFoodIndex === index && foodSearchResults.length > 0 && (
                          <div className="food-search-dropdown">
                            {foodSearchResults.map((food, foodIndex) => (
                              <div
                                key={foodIndex}
                                className="food-search-result"
                                onClick={() => selectFood(food, index)}
                              >
                                <div className="food-result-name">{food.name}</div>
                                <div className="food-result-nutrition">
                                  {food.calories} cal | {food.protein}g P | {food.carbs}g C | {food.fat}g F
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <input
                        type="number"
                        placeholder="Quantity"
                        value={item.quantity}
                        onChange={(e) => updateFoodItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="food-quantity-input"
                      />
                      <select
                        value={item.unit}
                        onChange={(e) => updateFoodItem(index, 'unit', e.target.value)}
                        className="food-unit-select"
                      >
                        <option value="grams">grams</option>
                        <option value="pieces">pieces</option>
                        <option value="cups">cups</option>
                        <option value="ounces">ounces</option>
                        <option value="tablespoons">tablespoons</option>
                        <option value="teaspoons">teaspoons</option>
                      </select>
                      
                      {item.calories && item.quantity && (
                        <div className="item-calories">
                          {Math.round((item.calories * item.quantity) / (item.servingSize || 1))} cal
                        </div>
                      )}
                      
                      <button
                        onClick={() => removeFoodItem(index)}
                        className="remove-item-btn"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <div className="modal-actions">
                  <button onClick={addFoodItem} className="add-item-btn">
                    + Add Food Item
                  </button>
                  <div className="modal-buttons">
                    <button
                      onClick={() => {
                        setShowAddMeal(false);
                        setFoodSearchResults([]);
                        setSearchQuery('');
                        setShowFoodSearch(false);
                        setSelectedFoodIndex(null);
                      }}
                      className="cancel-btn"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={addMeal} 
                      className="save-btn"
                      disabled={newMeal.items.length === 0}
                    >
                      Save Meal ({Math.round(calculateMealCalories())} cal)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'nutrition' && todayData && (
        <div className="nutrition-section">
          <h2>Nutritional Breakdown</h2>
          <div className="nutrition-grid">
            <div className="nutrition-item">
              <div className="nutrition-label">Calories:</div>
              <div className="nutrition-value">{todayData.totalDailyCalories}</div>
              <div className="nutrition-bar">
                <div
                  className="nutrition-fill"
                  style={{ width: `${Math.min(getCaloriePercentage(), 100)}%` }}
                />
              </div>
            </div>
            <div className="nutrition-item">
              <div className="nutrition-label">Protein:</div>
              <div className="nutrition-value">{todayData.totalProtein}g</div>
              <div className="nutrition-bar">
                <div
                  className="nutrition-fill protein"
                  style={{ width: `${Math.min((todayData.totalProtein / 50) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="nutrition-item">
              <div className="nutrition-label">Carbs:</div>
              <div className="nutrition-value">{todayData.totalCarbs}g</div>
              <div className="nutrition-bar">
                <div
                  className="nutrition-fill carbs"
                  style={{ width: `${Math.min((todayData.totalCarbs / 300) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="nutrition-item">
              <div className="nutrition-label">Fat</div>
              <div className="nutrition-value">{todayData.totalFat}g</div>
              <div className="nutrition-bar">
                <div
                  className="nutrition-fill fat"
                  style={{ width: `${Math.min((todayData.totalFat / 65) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="nutrition-item">
              <div className="nutrition-label">Fiber</div>
              <div className="nutrition-value">{todayData.totalFiber}g</div>
              <div className="nutrition-bar">
                <div
                  className="nutrition-fill fiber"
                  style={{ width: `${Math.min((todayData.totalFiber / 25) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="nutrition-item">
              <div className="nutrition-label">Sugar</div>
              <div className="nutrition-value">{todayData.totalSugar}g</div>
              <div className="nutrition-bar">
                <div
                  className="nutrition-fill sugar"
                  style={{ width: `${Math.min((todayData.totalSugar / 50) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="nutrition-item">
              <div className="nutrition-label">Sodium</div>
              <div className="nutrition-value">{todayData.totalSodium}mg</div>
              <div className="nutrition-bar">
                <div
                  className="nutrition-fill sodium"
                  style={{ width: `${Math.min((todayData.totalSodium / 2300) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalorieTrackerPage;
