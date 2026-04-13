const mongoose = require('mongoose');

const pantryItemSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Item name is required'],
            trim: true,
            maxlength: [100, 'Item name cannot exceed 100 characters'],
        },
        quantity: {
            type: Number,
            required: [true, 'Quantity is required'],
            min: [0, 'Quantity cannot be negative'],
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
            required: [true, 'Quantity unit is required'],
            default: 'units',
            trim: true,
        },
        expiryDate: {
            type: Date,
            required: [true, 'Expiry date is required'],
            validate: {
                validator: function (value) {
                    // If it's a new document, check if it's in the future
                    // If it's an update, we might allow past dates if they were already there
                    if (this.isNew) {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return value >= today;
                    }
                    return true;
                },
                message: 'Expiry date cannot be in the past for new items',
            },
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
            trim: true,
        },
        location: {
            type: String,
            enum: ['fridge', 'freezer', 'pantry', 'cupboard'],
            default: 'pantry',
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User ID is required'],
        },
        familyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Family',
            default: null,
        },
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        lastModifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        notes: {
            type: String,
            maxlength: [500, 'Notes cannot exceed 500 characters'],
            trim: true,
        },
        status: {
            type: String,
            enum: ['fresh', 'expiring', 'expired'],
            default: 'fresh',
        },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt automatically
        toJSON: {
            virtuals: true,
            transform: function (doc, ret) {
                delete ret.password; // Remove password from JSON output
                return ret;
            },
        },
        toObject: {
            virtuals: true,
        },
    }
);

// Virtual for days until expiry
pantryItemSchema.virtual('daysUntilExpiry').get(function () {
    const today = new Date();
    const expiryDate = new Date(this.expiryDate);
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});

// Virtual for checking if item is expiring soon (within 3 days)
pantryItemSchema.virtual('isExpiringSoon').get(function () {
    return this.daysUntilExpiry <= 3 && this.daysUntilExpiry > 0;
});

// Pre-save middleware to update status based on expiry date
pantryItemSchema.pre('save', function () {
    const today = new Date();
    const expiryDate = new Date(this.expiryDate);
    const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        this.status = 'expired';
    } else if (diffDays <= 3) {
        this.status = 'expiring';
    } else {
        this.status = 'fresh';
    }
});

// Indexes for better query performance
pantryItemSchema.index({ userId: 1, expiryDate: 1 });
pantryItemSchema.index({ userId: 1, status: 1 });
pantryItemSchema.index({ userId: 1, category: 1 });
pantryItemSchema.index({ familyId: 1, expiryDate: 1 });
pantryItemSchema.index({ familyId: 1, status: 1 });

// Static method to find items accessible by a user (personal + family shared)
pantryItemSchema.statics.findAccessibleByUser = async function (userId, familyId) {
    const query = {
        $or: [
            { userId }, // Personal items
        ]
    };

    if (familyId) {
        query.$or.push({ familyId }); // Family shared items
    }

    return this.find(query).sort({ expiryDate: 1 });
};

module.exports = mongoose.model('PantryItem', pantryItemSchema);
