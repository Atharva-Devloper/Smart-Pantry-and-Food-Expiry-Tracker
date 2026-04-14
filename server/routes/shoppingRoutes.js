const express = require('express');
const router = express.Router();
const ShoppingItem = require('../models/ShoppingItem');
const PantryItem = require('../models/PantryItem');
const { User } = require('../models');
const authMiddleware = require('../middleware/auth');

// Get all shopping items for a user (filtered by family)
router.get('/', authMiddleware, async (req, res) => {
    try {
        // Get user's current family
        const user = await User.findById(req.userId).select('currentFamilyId');
        const currentFamilyId = user?.currentFamilyId;

        // Get shopping items for current family (or personal if no family)
        let query;
        if (currentFamilyId) {
            // Show family shopping list items
            query = { familyId: currentFamilyId };
            console.log(`📋 Fetching family shopping items from family: ${currentFamilyId}`);
        } else {
            // Show personal shopping items only
            query = { userId: req.userId, familyId: null };
            console.log(`📋 Fetching personal shopping items for user: ${req.userId}`);
        }

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

        // Get user's current family
        const user = await User.findById(req.userId).select('currentFamilyId');
        const currentFamilyId = user?.currentFamilyId;

        const item = new ShoppingItem({
            name: req.body.name.trim(),
            quantity: req.body.quantity || 1,
            quantityUnit: req.body.quantityUnit || 'units',
            category: req.body.category || 'other',
            priority: req.body.priority || 'medium',
            userId: req.userId,
            familyId: currentFamilyId || null
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

        // Check authorization: user owns item OR is in same family
        const isOwner = item.userId.toString() === req.userId.toString();
        const isInSameFamily = item.familyId && (
            await User.findById(req.userId)
                .select('currentFamilyId')
                .then(user => user?.currentFamilyId?.toString() === item.familyId.toString())
        );

        if (!isOwner && !isInSameFamily) {
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

            await PantryItem.create({
                name: item.name,
                userId: req.userId,
                familyId: currentFamilyId || null,
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

        // Check authorization: user owns item OR is in same family
        const isOwner = item.userId.toString() === req.userId.toString();
        const isInSameFamily = item.familyId && (
            await User.findById(req.userId)
                .select('currentFamilyId')
                .then(user => user?.currentFamilyId?.toString() === item.familyId.toString())
        );

        if (!isOwner && !isInSameFamily) {
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
