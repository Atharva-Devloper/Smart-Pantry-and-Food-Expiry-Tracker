// Export all models from a central location
const User = require('./User');
const PantryItem = require('./PantryItem');
const ShoppingItem = require('./ShoppingItem');
const WasteLog = require('./WasteLog');
const Recipe = require('./Recipe');
const Family = require('./Family');
const CalorieTracker = require('./CalorieTracker');

module.exports = {
    User,
    PantryItem,
    ShoppingItem,
    WasteLog,
    Recipe,
    Family,
    CalorieTracker,
};
