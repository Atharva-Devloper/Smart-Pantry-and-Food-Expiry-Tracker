import { useEffect, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import API_BASE_URL from '../config';
import { useAuth } from '../context/AuthContext';
import '../styles/WastePage.css';

const WastePage = () => {
    const { user } = useAuth();
    const [period, setPeriod] = useState(30);
    const [timelineData, setTimelineData] = useState([]);
    const [categoryTotals, setCategoryTotals] = useState([]);
    const [dailyTotals, setDailyTotals] = useState([]);
    const [cumulativeDailyTotals, setCumulativeDailyTotals] = useState([]);
    const [familyTotals, setFamilyTotals] = useState([]);
    const [totalEstimatedValue, setTotalEstimatedValue] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const COLORS = [
        '#FF6B6B',
        '#4ECDC4',
        '#45B7D1',
        '#FFA07A',
        '#98D8C8',
        '#F7DC6F',
        '#BB8FCE',
        '#85C1E2',
        '#F8B195',
        '#C1CDCD',
    ];

    const categoryEmojis = {
        fruits: '🍎',
        vegetables: '🥬',
        dairy: '🥛',
        meat: '🥩',
        seafood: '🐟',
        grains: '🌾',
        snacks: '🍪',
        beverages: '🥤',
        condiments: '🧂',
        frozen: '🧊',
        baking: '🧁',
        canned: '🥫',
        other: '📦',
    };

    useEffect(() => {
        const fetchWasteData = async () => {
            if (!user) {
                setError('User not authenticated');
                setLoading(false);
                return;
            }

            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication token missing');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError('');
                const response = await fetch(
                    `${API_BASE_URL}/api/waste/timeline?days=${period}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(
                        errorData.message ||
                        `Failed to fetch waste data (${response.status})`
                    );
                }

                const data = await response.json();
                setTimelineData(data.timelineData);
                setCategoryTotals(data.categoryTotals);
                setDailyTotals(data.dailyTotals);
                setCumulativeDailyTotals(data.cumulativeDailyTotals || []);
                setFamilyTotals(data.familyTotals || []);
                setTotalEstimatedValue(data.totalEstimatedValue || 0);
            } catch (err) {
                console.error('Error fetching waste data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchWasteData();
    }, [period, user]);

    const trendChartData = dailyTotals.map((day) => {
        const cumulativeMatch = cumulativeDailyTotals.find(
            (entry) => entry.date === day._id
        );
        return {
            date: day._id,
            totalCount: day.totalCount,
            cumulativeCount: cumulativeMatch?.cumulativeCount || 0,
        };
    });

    const getTotalWastedCount = () => {
        return categoryTotals.reduce((sum, cat) => sum + (cat.totalCount || 0), 0);
    };

    const getFamilyQuantity = (family) => {
        const match = familyTotals.find((f) => f._id === family);
        return match?.totalNormalizedQuantity || 0;
    };

    const getPeriodLabel = () => {
        if (period === 1) return 'Last 24 Hours';
        if (period === 7) return 'Last 7 Days';
        if (period === 30) return 'Last 30 Days';
        return `Last ${period} Days`;
    };

    if (!user) {
        return (
            <div className="waste-container">
                <div className="error-state">
                    <p>Please log in to view waste analytics</p>
                </div>
            </div>
        );
    }

    return (
        <div className="waste-page">
            <div className="waste-header">
                <h1>🗑️ Waste Tracking</h1>
            </div>

            <div className="waste-container">
                {error && <div className="error-msg">{error}</div>}

                {/* Period Selector */}
                <div className="period-selector">
                    <button
                        className={`period-btn ${period === 1 ? 'active' : ''}`}
                        onClick={() => setPeriod(1)}
                    >
                        📅 Day
                    </button>
                    <button
                        className={`period-btn ${period === 7 ? 'active' : ''}`}
                        onClick={() => setPeriod(7)}
                    >
                        📆 Week
                    </button>
                    <button
                        className={`period-btn ${period === 30 ? 'active' : ''}`}
                        onClick={() => setPeriod(30)}
                    >
                        📋 Month
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="stats-cards">
                    <div className="stat-card">
                        <h3>Total Items Wasted</h3>
                        <p className="stat-value">{getTotalWastedCount()}</p>
                        <span className="stat-period">{getPeriodLabel()}</span>
                    </div>
                    <div className="stat-card">
                        <h3>Total Quantity Wasted</h3>
                        <p className="stat-value">${totalEstimatedValue.toFixed(2)}</p>
                        <span className="stat-period">Estimated Value</span>
                    </div>
                </div>

                {loading ? (
                    <div className="loading">Loading waste analytics...</div>
                ) : (
                    <>
                        {/* Daily Waste Trend */}
                        <div className="chart-section">
                            <h2>📈 Daily Waste Trend</h2>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={trendChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 12 }}
                                        interval={Math.floor(trendChartData.length / 7) || 0}
                                    />
                                    <YAxis
                                        label={{
                                            value: 'Items Wasted',
                                            angle: -90,
                                            position: 'insideLeft',
                                        }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#f9f9f9',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px',
                                        }}
                                        formatter={(value) => [value, 'Items']}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="totalCount"
                                        stroke="#FF6B6B"
                                        dot={{ r: 4 }}
                                        activeDot={{ r: 6 }}
                                        name="Items Wasted"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="cumulativeCount"
                                        stroke="#2E86DE"
                                        dot={false}
                                        strokeWidth={2}
                                        name="Cumulative Items"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="chart-section">
                        <h2>⚖️ Quantity by Unit Family</h2>
                        <div className="stats-cards">
                            <div className="stat-card">
                                <h3>Mass Wasted</h3>
                                <p className="stat-value">{getFamilyQuantity('mass').toFixed(1)}</p>
                                <span className="stat-period">grams (g)</span>
                            </div>
                            <div className="stat-card">
                                <h3>Volume Wasted</h3>
                                <p className="stat-value">{getFamilyQuantity('volume').toFixed(1)}</p>
                                <span className="stat-period">milliliters (ml)</span>
                            </div>
                            <div className="stat-card">
                                <h3>Discrete Wasted</h3>
                                <p className="stat-value">{getFamilyQuantity('discrete').toFixed(1)}</p>
                                <span className="stat-period">item units</span>
                            </div>
                        </div>
                    </div>

                    {/* Category Breakdown - Stacked Bar Chart */}
                    <div className="chart-section">
                        <h2>🍎 Waste by Food Category</h2>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={timelineData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 12 }}
                                        interval={Math.floor(timelineData.length / 7) || 0}
                                    />
                                    <YAxis
                                        label={{
                                            value: 'Items',
                                            angle: -90,
                                            position: 'insideLeft',
                                        }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#f9f9f9',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px',
                                        }}
                                        formatter={(value) => [value, 'Items']}
                                    />
                                    <Legend />
                                    {categoryTotals.map((cat, idx) => (
                                        <Bar
                                            key={cat._id}
                                            dataKey={cat._id}
                                            stackId="categories"
                                            fill={COLORS[idx % COLORS.length]}
                                            name={`${categoryEmojis[cat._id] || '📦'} ${cat._id}`}
                                        />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Category Pie Chart */}
                    <div className="chart-section">
                        <h2>🥧 Total Waste Distribution</h2>
                        <div className="chart-container pie-container">
                            <ResponsiveContainer width="100%" height={350}>
                                <PieChart>
                                    <Pie
                                        data={categoryTotals}
                                        dataKey="totalCount"
                                        nameKey="_id"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={120}
                                        label={({ _id, totalCount }) =>
                                            `${categoryEmojis[_id] || '📦'} ${_id}: ${totalCount}`
                                        }
                                    >
                                        {categoryTotals.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={COLORS[index % COLORS.length]}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value) => [value, 'Items']}
                                        contentStyle={{
                                            backgroundColor: '#f9f9f9',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px',
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Category Details Table */}
                    <div className="chart-section">
                        <h2>📋 Category Details</h2>
                        <div className="category-table">
                            <div className="table-header">
                                <div className="table-col">Food Type</div>
                                <div className="table-col">Items Wasted</div>
                                <div className="table-col">Share</div>
                            </div>
                            <div className="table-body">
                                {categoryTotals.length === 0 ? (
                                    <div className="table-row empty">
                                        <p>No waste data for this period. Great job!</p>
                                    </div>
                                ) : (
                                    categoryTotals.map((cat) => (
                                        <div key={cat._id} className="table-row">
                                            <div className="table-col">
                                                {categoryEmojis[cat._id] || '📦'} {cat._id}
                                            </div>
                                            <div className="table-col">{cat.totalCount}</div>
                                            <div className="table-col">
                                                {getTotalWastedCount() > 0
                                                    ? `${((cat.totalCount / getTotalWastedCount()) * 100).toFixed(1)}%`
                                                    : '0%'}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
            </div>
        </div>
    );
};

export default WastePage;
