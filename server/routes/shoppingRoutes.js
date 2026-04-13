const express = require('express');
const router = express.Router();
const ShoppingItem = require('../models/ShoppingItem');
const PantryItem = require('../models/PantryItem');

// Get all shopping items for a user
router.get('/', async (req, res) => {
    try {
        const items = await ShoppingItem.find({ userId: req.query.userId }).sort({ isPurchased: 1, createdAt: -1 });
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add item to shopping list
router.post('/', async (req, res) => {
    try {
        const item = new ShoppingItem(req.body);
        const newItem = await item.save();
        res.status(201).json(newItem);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Mark as purchased and optionally move to pantry
router.patch('/:id/purchase', async (req, res) => {
    try {
        const item = await ShoppingItem.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Item not found' });

        item.isPurchased = !item.isPurchased;
        await item.save();

        // If moveToPantry is true, create a pantry item
        if (req.body.moveToPantry && item.isPurchased) {
            const purchasedQty = Number(item.quantity);
            await PantryItem.create({
                name: item.name,
                userId: item.userId,
                addedBy: item.userId,
                category: item.category,
                quantity: Number.isFinite(purchasedQty) && purchasedQty > 0 ? purchasedQty : 1,
                quantityUnit: item.quantityUnit || 'units',
                expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 1 week
            });
        }

        res.json(item);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete item
router.delete('/:id', async (req, res) => {
    try {
        await ShoppingItem.findByIdAndDelete(req.params.id);
        res.json({ message: 'Item removed from shopping list' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
