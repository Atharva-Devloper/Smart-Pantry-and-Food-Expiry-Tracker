// Export all models from a central location
const User = require('./User');
const PantryItem = require('./PantryItem');
const ShoppingItem = require('./ShoppingItem');
const WasteLog = require('./WasteLog');

module.exports = {
  User,
  PantryItem,
  ShoppingItem,
  WasteLog
};
