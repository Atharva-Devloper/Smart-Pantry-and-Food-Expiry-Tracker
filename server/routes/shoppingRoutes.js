const express = require('express');
const router = express.Router();
const ShoppingItem = require('../models/ShoppingItem');
const PantryItem = require('../models/PantryItem');
const { User } = require('../models');
const authMiddleware = require('../middleware/auth');

// Get all shopping items for a family (shared inventory)
router.get('/', authMiddleware, async (req, res) => {
    try {
        // Get user's current family - required for shared inventory
        const user = await User.findById(req.userId).select('currentFamilyId');
        const currentFamilyId = user?.currentFamilyId;

        if (!currentFamilyId) {
            return res.status(400).json({ message: 'User must be part of a family to access shopping list' });
        }

        // Get shopping items for family only
        const query = { familyId: currentFamilyId };
        console.log(`📋 Fetching family shopping items from family: ${currentFamilyId}`);

        const items = await ShoppingItem.find(query).sort({ isPurchased: 1, createdAt: -1 });
        console.log(`✅ Found ${items.length} shopping items`);
        res.json(items);
    } catch (err) {
        console.error('❌ Error fetching shopping items:', err);
        res.status(500).json({ message: err.message });
    }
});

// Add item to shopping list
router.post('/', authMiddleware, async (req, res) => {
    try {
        console.log('📝 Adding shopping item:', { name: req.body.name, userId: req.userId });

        // Validate required fields
        if (!req.body.name || req.body.name.trim() === '') {
            return res.status(400).json({ message: 'Item name is required' });
        }

        // Get user's current family - required for shared inventory
        const user = await User.findById(req.userId).select('currentFamilyId');
        const currentFamilyId = user?.currentFamilyId;

        if (!currentFamilyId) {
            return res.status(400).json({ message: 'User must be part of a family to add shopping items' });
        }

        const item = new ShoppingItem({
            name: req.body.name.trim(),
            quantity: req.body.quantity || 1,
            quantityUnit: req.body.quantityUnit || 'units',
            category: req.body.category || 'other',
            priority: req.body.priority || 'medium',
            familyId: currentFamilyId // Always assign to family for shared inventory
        });

        const newItem = await item.save();
        console.log('✅ Shopping item created:', newItem._id);
        res.status(201).json(newItem);
    } catch (err) {
        console.error('❌ Error adding shopping item:', err);
        res.status(400).json({ message: `Error adding item: ${err.message}` });
    }
});

// Mark as purchased and optionally move to pantry
router.patch('/:id/purchase', authMiddleware, async (req, res) => {
    try {
        console.log(`🛍️  Marking item ${req.params.id} as purchased`);

        const item = await ShoppingItem.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Item not found' });

        // Check authorization: all shopping items are family items now
        if (!item.familyId) {
            return res.status(400).json({ message: 'Shopping item must belong to a family' });
        }

        const user = await User.findById(req.userId).select('currentFamilyId');
        const currentFamilyId = user?.currentFamilyId;

        if (!currentFamilyId || currentFamilyId.toString() !== item.familyId.toString()) {
            console.log(`❌ User ${req.userId} not authorized to modify item ${req.params.id}`);
            return res.status(403).json({ message: 'Not authorized to modify this item' });
        }

        item.isPurchased = !item.isPurchased;
        await item.save();
        console.log(`✅ Item marked as ${item.isPurchased ? 'purchased' : 'unpurchased'}`);

        // If moveToPantry is true, create a pantry item
        if (req.body.moveToPantry && item.isPurchased) {
            const purchasedQty = Number(item.quantity);
            // Get current family for the pantry item
            const user = await User.findById(req.userId).select('currentFamilyId');
            const currentFamilyId = user?.currentFamilyId;

            if (!currentFamilyId) {
                return res.status(400).json({ message: 'User must be part of a family to add items to pantry' });
            }

            await PantryItem.create({
                name: item.name,
                familyId: currentFamilyId,
                addedBy: req.userId,
                category: item.category,
                quantity: Number.isFinite(purchasedQty) && purchasedQty > 0 ? purchasedQty : 1,
                quantityUnit: item.quantityUnit || 'units',
                expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 1 week
            });
            console.log(`✅ Created pantry item from shopping list item`);
        }

        res.json(item);
    } catch (err) {
        console.error('❌ Error updating shopping item:', err);
        res.status(400).json({ message: err.message });
    }
});

// Delete item
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        console.log(`🗑️  Deleting shopping item: ${req.params.id}`);

        const item = await ShoppingItem.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Item not found' });

        // Check authorization: all shopping items are family items now
        if (!item.familyId) {
            return res.status(400).json({ message: 'Shopping item must belong to a family' });
        }

        const user = await User.findById(req.userId).select('currentFamilyId');
        const currentFamilyId = user?.currentFamilyId;

        if (!currentFamilyId || currentFamilyId.toString() !== item.familyId.toString()) {
            console.log(`❌ User ${req.userId} not authorized to delete item ${req.params.id}`);
            return res.status(403).json({ message: 'Not authorized to delete this item' });
        }

        await ShoppingItem.findByIdAndDelete(req.params.id);
        console.log('✅ Shopping item deleted');
        res.json({ message: 'Item removed from shopping list' });
    } catch (err) {
        console.error('❌ Error deleting shopping item:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
