import React, { useEffect, useMemo, useState } from 'react';
import '../styles/CalorieTrackerPage.css';
import API_BASE_URL from '../config';
import { useAuth } from '../context/AuthContext';

const roundTo2 = (value) => Math.round(Number(value || 0) * 100) / 100;
const mealTypeOptions = ['breakfast', 'lunch', 'dinner', 'snack'];

const getWeekStart = (dateStr) => {
    const date = new Date(dateStr);
    const day = date.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
};

const CalorieTrackerPage = () => {
    const { token } = useAuth();
    const [trackerData, setTrackerData] = useState(null);
    const [pantryItems, setPantryItems] = useState([]);
    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().split('T')[0]
    );
    const [formData, setFormData] = useState({
        mealType: 'breakfast',
        pantryItemId: '',
        consumedQuantity: '',
    });
    const [mealDraftItems, setMealDraftItems] = useState([]);
    const [historyDays, setHistoryDays] = useState(30);
    const [historyViewMode, setHistoryViewMode] = useState('daily');

    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }
        const load = async () => {
            setLoading(true);
            await Promise.all([
                fetchTrackerByDate(selectedDate),
                fetchPantryItems(),
                fetchHistoryWindow(selectedDate, historyDays),
            ]);
            setLoading(false);
        };
        load();
    }, [token, selectedDate, historyDays]);

    const fetchTrackerByDate = async (date) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/calories/date/${date}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setTrackerData(data);
            } else {
                setTrackerData({ date, meals: [], totalDailyCalories: 0 });
            }
        } catch (err) {
            console.error('Error fetching tracker data:', err);
            setTrackerData({ date, meals: [], totalDailyCalories: 0 });
        }
    };

    const fetchPantryItems = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/calories/pantry-items`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) return;

            const items = await response.json();
            setPantryItems(items);
            if (!formData.pantryItemId && items.length > 0) {
                setFormData((prev) => ({ ...prev, pantryItemId: items[0]._id }));
            }
        } catch (err) {
            console.error('Error fetching pantry items:', err);
        }
    };

    const fetchHistoryWindow = async (endDate, days) => {
        try {
            const end = new Date(endDate);
            const start = new Date(end);
            start.setDate(end.getDate() - (Number(days) - 1));

            const response = await fetch(
                `${API_BASE_URL}/api/calories/history?startDate=${start.toISOString()}&endDate=${end.toISOString()}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (!response.ok) {
                setHistoryData([]);
                return;
            }

            const data = await response.json();
            setHistoryData(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching calorie history:', err);
            setHistoryData([]);
        }
    };

    const handleDateChange = async (date) => {
        setSelectedDate(date);
    };

    const getSelectedPantryItem = () =>
        pantryItems.find((item) => item._id === formData.pantryItemId);

    const addIngredientToMealDraft = () => {
        setError('');
        const selectedItem = getSelectedPantryItem();
        const qty = Number(formData.consumedQuantity);

        if (!selectedItem) {
            setError('Please select an inventory item');
            return;
        }

        if (!Number.isFinite(qty) || qty <= 0) {
            setError('Please enter a valid consumed quantity');
            return;
        }

        const alreadySelectedQty = mealDraftItems
            .filter((item) => item.pantryItemId === selectedItem._id)
            .reduce((sum, item) => sum + Number(item.consumedQuantity || 0), 0);

        if (qty + alreadySelectedQty > Number(selectedItem.quantity || 0)) {
            setError(
                `Total planned quantity for ${selectedItem.name} exceeds inventory (${selectedItem.quantity} ${selectedItem.quantityUnit})`
            );
            return;
        }

        setMealDraftItems((prev) => [
            ...prev,
            {
                pantryItemId: selectedItem._id,
                consumedQuantity: roundTo2(qty),
                name: selectedItem.name,
                unit: selectedItem.quantityUnit,
            },
        ]);
        setFormData((prev) => ({ ...prev, consumedQuantity: '' }));
    };

    const removeIngredientFromMealDraft = (index) => {
        setMealDraftItems((prev) => prev.filter((_, i) => i !== index));
    };

    const logMealConsumption = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (mealDraftItems.length === 0) {
            setError('Add at least one ingredient to the meal draft first');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/calories/consume-batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    date: selectedDate,
                    mealType: formData.mealType,
                    items: mealDraftItems.map((item) => ({
                        pantryItemId: item.pantryItemId,
                        consumedQuantity: item.consumedQuantity,
                    })),
                }),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                setError(data.error || 'Failed to log consumed item');
                return;
            }

            setTrackerData(data.tracker);
            setMealDraftItems([]);
            setFormData((prev) => ({ ...prev, consumedQuantity: '' }));

            const mealSummary = data.mealSummary;
            if (mealSummary) {
                setSuccess(
                    `Logged ${mealSummary.ingredientCount} ingredients to ${mealSummary.mealType} (${Math.round(mealSummary.totalMealCalories)} kcal)`
                );
            } else {
                setSuccess('Meal logged successfully');
            }

            await Promise.all([
                fetchPantryItems(),
                fetchTrackerByDate(selectedDate),
                fetchHistoryWindow(selectedDate, historyDays),
            ]);
        } catch (err) {
            console.error('Error logging consumption:', err);
            setError('Failed to log consumed meal');
        }
    };

    const deleteMealItem = async (date, mealType, itemIndex) => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/calories/meal/${encodeURIComponent(date)}/${mealType}/${itemIndex}`,
                {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (!response.ok) return;
            const data = await response.json();
            setTrackerData(data);
            await fetchHistoryWindow(selectedDate, historyDays);
        } catch (err) {
            console.error('Error deleting meal item:', err);
        }
    };

    const selectedPantryItem = getSelectedPantryItem();
    const dailyTotal = Math.round(trackerData?.totalDailyCalories || 0);

    const dailyHistory = useMemo(() => {
        return [...historyData]
            .map((entry) => ({
                date: new Date(entry.date).toISOString().split('T')[0],
                calories: Math.round(Number(entry.totalDailyCalories || 0)),
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [historyData]);

    const weeklyHistory = useMemo(() => {
        const grouped = new Map();
        dailyHistory.forEach((entry) => {
            const weekStart = getWeekStart(entry.date);
            grouped.set(weekStart, (grouped.get(weekStart) || 0) + entry.calories);
        });

        return [...grouped.entries()]
            .map(([weekStart, calories]) => ({ weekStart, calories: Math.round(calories) }))
            .sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart));
    }, [dailyHistory]);

    const activeHistory = historyViewMode === 'weekly' ? weeklyHistory : dailyHistory;
    const cumulativeHistory = useMemo(() => {
        let running = 0;
        return activeHistory.map((entry) => {
            running += Number(entry.calories || 0);
            return { ...entry, cumulativeCalories: Math.round(running) };
        });
    }, [activeHistory]);

    const totalWindowCalories = cumulativeHistory.length
        ? cumulativeHistory[cumulativeHistory.length - 1].cumulativeCalories
        : 0;

    if (loading) {
        return <div className="loading">Loading calorie data...</div>;
    }

    return (
        <div className="calorie-tracker">
            <div className="tracker-header">
                <h1>🔥 Calorie Tracker</h1>
                <div className="tracker-header-controls">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="date-input"
                    />
                </div>
            </div>

            <div className="tracker-main">
                {error && <div className="error">{error}</div>}
                {success && <div className="success">{success}</div>}

                <div className="stats-cards" style={{ marginBottom: '1.5rem' }}>
                    <div className="stat-card">
                        <h3>Total Calories ({selectedDate})</h3>
                        <div className="stat-value">{dailyTotal}</div>
                    </div>
                    <div className="stat-card">
                        <h3>Inventory Items Available</h3>
                        <div className="stat-value">{pantryItems.length}</div>
                    </div>
                    <div className="stat-card">
                        <h3>{historyViewMode === 'weekly' ? 'Cumulative Weekly' : 'Cumulative Daily'}</h3>
                        <div className="stat-value">{totalWindowCalories}</div>
                    </div>
                </div>

                <div className="meals-section" style={{ marginBottom: '1.5rem' }}>
                    <div className="meals-header">
                        <h2>Build Meal From Inventory</h2>
                    </div>

                    <form onSubmit={logMealConsumption}>
                        <div
                            className="food-item-input"
                            style={{ gridTemplateColumns: '1fr 1.5fr 1fr auto' }}
                        >
                            <select
                                className="food-unit-select"
                                value={formData.mealType}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, mealType: e.target.value }))
                            }
                        >
                            <option value="breakfast">Breakfast</option>
                            <option value="lunch">Lunch</option>
                            <option value="dinner">Dinner</option>
                            <option value="snack">Snack</option>
                        </select>

                        <select
                            className="food-unit-select"
                            value={formData.pantryItemId}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, pantryItemId: e.target.value }))
                            }
                        >
                            {pantryItems.length === 0 && <option value="">No pantry items</option>}
                            {pantryItems.map((item) => (
                                <option key={item._id} value={item._id}>
                                    {item.name} ({item.quantity} {item.quantityUnit})
                                </option>
                            ))}
                        </select>

                        <input
                            type="number"
                            className="food-quantity-input"
                            placeholder={
                                selectedPantryItem
                                    ? `Qty in ${selectedPantryItem.quantityUnit}`
                                    : 'Consumed qty'
                            }
                            min="0.01"
                            step="0.01"
                            max={selectedPantryItem?.quantity || undefined}
                            value={formData.consumedQuantity}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, consumedQuantity: e.target.value }))
                            }
                        />

                        <button
                            type="button"
                            className="save-btn"
                            onClick={addIngredientToMealDraft}
                            disabled={!selectedPantryItem}
                        >
                            Add Ingredient
                        </button>
                    </div>

                    <div style={{ marginTop: '0.75rem' }}>
                        {mealDraftItems.length === 0 ? (
                            <p style={{ margin: 0, opacity: 0.75 }}>
                                Add one or more ingredients, then log them together for this meal.
                            </p>
                        ) : (
                            <div className="meal-items" style={{ marginBottom: '0.8rem' }}>
                                {mealDraftItems.map((item, idx) => (
                                    <div key={`${item.pantryItemId}-${idx}`} className="food-item">
                                        <div className="food-main">
                                            <span className="food-name">{item.name}</span>
                                            <span className="food-quantity">
                                                {item.consumedQuantity} {item.unit}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeIngredientFromMealDraft(idx)}
                                            className="delete-item-btn"
                                            title="Remove ingredient"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="save-btn"
                            disabled={mealDraftItems.length === 0}
                        >
                            Log Meal ({mealDraftItems.length} items)
                        </button>
                    </div>
                </form>
            </div>

            <div className="meals-section">
                <div className="meals-header">
                    <h2>Meals Logged</h2>
                </div>

                {!trackerData?.meals || trackerData.meals.length === 0 ? (
                    <div className="no-meals">
                        <div className="no-meals-icon">🍽</div>
                        <h3>No consumption logged yet</h3>
                        <p>Add ingredients above and log them as a meal.</p>
                    </div>
                ) : (
                    trackerData.meals.map((meal, index) => (
                        <div key={index} className="meal-card">
                            <div className="meal-header">
                                <h3 className="meal-type">
                                    {meal.type.charAt(0).toUpperCase() + meal.type.slice(1)}
                                </h3>
                                <span className="meal-calories">
                                    {Math.round(meal.totalCalories || 0)} calories
                                </span>
                            </div>

                            <div className="meal-items">
                                {meal.items.map((item, itemIndex) => (
                                    <div key={itemIndex} className="food-item">
                                        <div className="food-main">
                                            <span className="food-name">{item.name}</span>
                                            <span className="food-quantity">
                                                {item.quantity} {item.unit}
                                            </span>
                                            <span className="food-calories">
                                                {Math.round(item.calories || 0)} cal
                                            </span>
                                            <span className="food-quantity" style={{ opacity: 0.75 }}>
                                                Source: {item.estimateSource || 'fallback'}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => deleteMealItem(selectedDate, meal.type, itemIndex)}
                                            className="delete-item-btn"
                                            title="Delete this logged entry"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="meals-section" style={{ marginTop: '1.5rem' }}>
                <div className="meals-header">
                    <h2>History and Cumulative Calories</h2>
                </div>

                <div
                    className="food-item-input"
                    style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: '1rem' }}
                >
                    <select
                        className="food-unit-select"
                        value={historyViewMode}
                        onChange={(e) => setHistoryViewMode(e.target.value)}
                    >
                        <option value="daily">Daily View</option>
                        <option value="weekly">Weekly Condensed View</option>
                    </select>

                    <select
                        className="food-unit-select"
                        value={historyDays}
                        onChange={(e) => setHistoryDays(Number(e.target.value))}
                    >
                        <option value={7}>Last 7 Days</option>
                        <option value={14}>Last 14 Days</option>
                        <option value={30}>Last 30 Days</option>
                        <option value={60}>Last 60 Days</option>
                    </select>

                    <div className="food-quantity-input" style={{ display: 'flex', alignItems: 'center' }}>
                        Window Total: {totalWindowCalories} kcal
                    </div>
                </div>

                {cumulativeHistory.length === 0 ? (
                    <p style={{ margin: 0, opacity: 0.75 }}>No history available in selected range.</p>
                ) : (
                    <div className="meal-items">
                        {cumulativeHistory.map((entry) => (
                            <div
                                key={entry.weekStart || entry.date}
                                className="food-item"
                                style={{ justifyContent: 'space-between' }}
                            >
                                <div className="food-main">
                                    <span className="food-name">
                                        {historyViewMode === 'weekly'
                                            ? `Week of ${entry.weekStart}`
                                            : entry.date}
                                    </span>
                                    <span className="food-calories">{entry.calories} kcal</span>
                                </div>
                                <span className="food-quantity" style={{ fontWeight: 700 }}>
                                    Cumulative: {entry.cumulativeCalories} kcal
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
        </div>
    );
};

export default CalorieTrackerPage;
