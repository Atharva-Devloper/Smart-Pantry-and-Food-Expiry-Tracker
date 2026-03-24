const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    ingredientsNeeded: [
      {
        type: String,
        trim: true,
      },
    ],
    instructions: [
      {
        type: String,
        trim: true,
      },
    ],
    usedIngredients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PantryItem',
      },
    ],
    isFavorite: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
    cooked: {
      type: Boolean,
      default: false,
    },
    cookedDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

recipeSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Recipe', recipeSchema);
