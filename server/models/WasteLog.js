const mongoose = require('mongoose');

const wasteLogSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            required: true,
        },
        quantity: {
            type: Number,
            default: 1,
        },
        quantityUnit: {
            type: String,
            enum: [
                'units',
                'g',
                'kg',
                'ml',
                'l',
                'oz',
                'lb',
                'cups',
                'tbsp',
                'tsp',
                'pack',
                'bottle',
                'can',
                'box',
            ],
            default: 'units',
        },
        reason: {
            type: String,
            enum: ['expired', 'spoiled', 'over-purchased', 'other'],
            default: 'expired',
        },
        estimatedValue: {
            type: Number,
            default: 0,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false, // Made optional since family is now primary
        },
        familyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Family',
            required: [true, 'Family ID is required'], // Now required for shared inventory
        },
        loggedAt: {
            type: Date,
            default: Date.now,
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('WasteLog', wasteLogSchema);
