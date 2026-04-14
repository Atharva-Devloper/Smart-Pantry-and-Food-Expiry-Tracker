const mongoose = require('mongoose');

const shoppingItemSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Item name is required'],
            trim: true,
        },
        quantity: {
            type: Number,
            default: 1,
            min: 0,
        },
        quantityUnit: {
            type: String,
            enum: ['units', 'g', 'kg', 'ml', 'l', 'oz', 'lb', 'cups', 'tbsp', 'tsp', 'pack', 'bottle', 'can', 'box'],
            default: 'units',
        },
        category: {
            type: String,
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
        familyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Family',
            default: null,
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium',
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('ShoppingItem', shoppingItemSchema);
