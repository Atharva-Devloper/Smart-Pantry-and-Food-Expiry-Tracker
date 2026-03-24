const mongoose = require('mongoose');

const shoppingItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    quantity: {
      type: String,
      default: '1',
    },
    category: {
      type: String,
      enum: [
        'fruits',
        'vegetables',
        'dairy',
        'meat',
        'grains',
        'snacks',
        'beverages',
        'condiments',
        'frozen',
        'other',
      ],
      default: 'other',
    },
    isPurchased: {
      type: Boolean,
      default: false,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    location: {
      type: String,
      enum: ['fridge', 'freezer', 'pantry', 'cupboard'],
      default: 'pantry',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ShoppingItem', shoppingItemSchema);
