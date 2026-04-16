const express = require('express');
const router = express.Router();
const { PantryItem, Family, User, WasteLog } = require('../models');
const { analyzeFood } = require('../utils/groq');
const authMiddleware = require('../middleware/auth');

// ---------- NORMALIZATION HELPERS ----------

const normalizeCategory = (cat) => {
    const map = {
        fruit: 'fruits',
        fruits: 'fruits',
        vegetable: 'vegetables',
        vegetables: 'vegetables',
        dairy: 'dairy',
        meat: 'meat',
        grain: 'grains',
        grains: 'grains',
        snack: 'snacks',
        snacks: 'snacks',
        beverage: 'beverages',
        beverages: 'beverages',
        condiment: 'condiments',
        condiments: 'condiments',
        frozen: 'frozen',
        other: 'other',
    };

    return map[cat?.toLowerCase()] || 'other';
};

const normalizeLocation = (loc) => {
    const map = {
        fridge: 'fridge',
        refrigerator: 'fridge',
        freezer: 'freezer',
        pantry: 'pantry',
        cupboard: 'cupboard',
    };

    return map[loc?.toLowerCase()] || 'pantry';
};

// ---------- GET ALL PRODUCTS (Personal + Family Shared) ----------

router.get('/', authMiddleware, async (req, res) => {
    try {
        const { search, category, location, status, sort, view } = req.query;

        // Get user's current family - required for shared inventory
        const user = await User.findById(req.userId).select('currentFamilyId');
        const currentFamilyId = user?.currentFamilyId;

        if (!currentFamilyId) {
            return res.status(400).json({ message: 'User must be part of a family to access inventory' });
        }

        // Build query - only family shared items
        let query = { familyId: currentFamilyId };

        // Search by name
        if (search) {
            query = { ...query, name: { $regex: search, $options: 'i' } };
        }

        // Filter by category
        if (category && category !== 'all') {
            query = { ...query, category };
        }

        // Filter by location
        if (location && location !== 'all') {
            query = { ...query, location };
        }

        // Filter by status (fresh, expiring, expired)
        if (status && status !== 'all') {
            query = { ...query, status };
        }

        let sortQuery = { expiryDate: 1 }; // Default sort by expiry date
        if (sort === 'name') sortQuery = { name: 1 };
        if (sort === 'quantity') sortQuery = { quantity: -1 };
        if (sort === 'newest') sortQuery = { createdAt: -1 };

        console.log(`📋 Fetching family products for family: ${currentFamilyId}`);
        const products = await PantryItem.find(query)
            .populate('addedBy', 'name')
            .populate('lastModifiedBy', 'name')
            .populate('familyId', 'name')
            .sort(sortQuery);
        console.log(`✅ Found ${products.length} products`);
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ---------- GET EXPIRY SUMMARY ----------

router.get('/summary', authMiddleware, async (req, res) => {
    try {
        // Get user's current family - required for shared inventory
        const user = await User.findById(req.userId).select('currentFamilyId');
        const currentFamilyId = user?.currentFamilyId;

        if (!currentFamilyId) {
            return res.status(400).json({ message: 'User must be part of a family to access inventory' });
        }

        // Build query - only family items
        let query = { familyId: currentFamilyId };

        const totalItems = await PantryItem.countDocuments(query);
        const expiredItems = await PantryItem.countDocuments({ ...query, status: 'expired' });
        const expiringSoon = await PantryItem.countDocuments({ ...query, status: 'expiring' });

        const categoryDistribution = await PantryItem.aggregate([
            { $match: query },
            { $group: { _id: '$category', count: { $sum: 1 } } },
        ]);

        res.json({
            totalItems,
            expiredItems,
            expiringSoon,
            categoryDistribution,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ---------- CREATE PRODUCT WITH AI ----------

router.post('/', authMiddleware, async (req, res) => {
    try {
        console.log('📦 Received product creation request:', {
            name: req.body.name,
            quantity: req.body.quantity,
            expiryDate: req.body.expiryDate,
            useAIFill: req.body.useAIFill,
            userId: req.userId,
        });

        // Validate required fields
        if (!req.body.name || !req.body.quantity || !req.body.expiryDate) {
            return res.status(400).json({
                message: 'Missing required fields: name, quantity, expiryDate',
            });
        }

        let aiData;
        const foodName = String(req.body.name).trim();
        const useAIFill = req.body.useAIFill !== false; // Default to true if not specified

        if (useAIFill) {
            try {
                console.log(`🤖 Calling AI for food: "${foodName}"`);
                aiData = await analyzeFood(foodName);
                console.log('✅ AI result:', aiData);
            } catch (aiErr) {
                console.error('⚠️  AI failed, using fallback:', aiErr.message);
                aiData = {
                    category: 'other',
                    storageLocation: 'pantry',
                    perishability: 'low',
                    advice: `Stored using default location.`,
                };
            }
        } else {
            // Use user-provided values when AI is disabled
            console.log('🚫 AI auto-fill disabled, using user-provided values');
            aiData = {
                category: req.body.category || 'other',
                storageLocation: req.body.location || 'pantry',
                perishability: 'unknown',
                advice: req.body.notes || '',
            };
        }

        // Get user's current family - required for shared inventory
        const user = await User.findById(req.userId).select('currentFamilyId');
        const familyId = user?.currentFamilyId;

        if (!familyId) {
            return res.status(400).json({ message: 'User must be part of a family to add items to inventory' });
        }

        const product = await PantryItem.create({
            ...req.body,
            familyId: familyId, // Always assign to family for shared inventory
            addedBy: req.userId,
            name: foodName,
            category: normalizeCategory(aiData.category),
            location: normalizeLocation(aiData.storageLocation),
            notes: aiData.advice,
        });

        console.log('✅ Product created successfully:', product._id);
        res.status(201).json(product);
    } catch (err) {
        console.error('❌ Error creating product:', err);
        res.status(400).json({ message: `Error creating product: ${err.message}` });
    }
});

// ---------- BATCH OPERATIONS ----------

router.delete('/batch', authMiddleware, async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'Invalid or empty IDs array' });
        }

        // Verify all items belong to user or their family before deletion
        const products = await PantryItem.find({ _id: { $in: ids } });
        const user = await User.findById(req.userId).select('currentFamilyId');

        for (const product of products) {
            const canDelete = await checkDeletePermission(product, req.userId);
            if (!canDelete) {
                return res.status(403).json({ message: 'Not authorized to delete this product' });
            }
        }

        const result = await PantryItem.deleteMany({ _id: { $in: ids } });
        res.json({ message: `${result.deletedCount} items deleted successfully` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.put('/batch/status', authMiddleware, async (req, res) => {
    try {
        const { ids, status } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'Invalid or empty IDs array' });
        }

        // Verify all items belong to user or their family before updating
        const products = await PantryItem.find({ _id: { $in: ids } });
        const user = await User.findById(req.userId).select('currentFamilyId');

        for (const product of products) {
            const canEdit = await checkEditPermission(product, req.userId);
            if (!canEdit) {
                return res.status(403).json({ message: 'Not authorized to edit this product' });
            }
        }

        const result = await PantryItem.updateMany(
            { _id: { $in: ids } },
            { $set: { status, lastModifiedBy: req.userId } }
        );
        res.json({ message: `${result.modifiedCount} items updated successfully` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        console.log(`🗑️  Deleting product: ${req.params.id}`);

        const product = await PantryItem.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check permissions
        const canDelete = await checkDeletePermission(product, req.userId);
        if (!canDelete) {
            return res.status(403).json({ message: 'Not authorized to delete this product' });
        }

        const deletedProduct = await PantryItem.findByIdAndDelete(req.params.id);

        // Track deletion in waste logs so analytics remain meaningful over time.
        await WasteLog.create({
            name: deletedProduct.name,
            category: deletedProduct.category || 'other',
            quantity: deletedProduct.quantity || 1,
            quantityUnit: deletedProduct.quantityUnit || 'units',
            reason: deletedProduct.status === 'expired' ? 'expired' : 'other',
            familyId: deletedProduct.familyId,
            userId: req.userId, // Track who deleted it
            loggedAt: new Date(),
        });

        console.log('✅ Product deleted successfully');
        res.json({
            message: 'Product deleted successfully',
            product: deletedProduct,
        });
    } catch (err) {
        console.error('❌ Error deleting product:', err);
        res.status(400).json({ message: err.message });
    }
});

// Helper function to check delete permissions for family items
async function checkDeletePermission(product, userId) {
    // All items are family items now
    if (!product.familyId) {
        return false;
    }

    const family = await Family.findById(product.familyId);
    if (!family) {
        return false;
    }

    // Owner and admins can always delete
    if (family.isAdmin(userId)) {
        return true;
    }

    // Members can delete if settings allow
    if (family.settings.allowMembersToDelete && family.isMember(userId)) {
        return true;
    }

    return false;
}

// ---------- UPDATE PRODUCT ----------

router.put('/:id', authMiddleware, async (req, res) => {
    try {
        console.log(`✏️  Updating product: ${req.params.id}`);

        const product = await PantryItem.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check permissions
        const canEdit = await checkEditPermission(product, req.userId);
        if (!canEdit) {
            return res.status(403).json({ message: 'Not authorized to edit this product' });
        }

        // Update with tracking
        const updateData = {
            ...req.body,
            lastModifiedBy: req.userId
        };

        const updatedProduct = await PantryItem.findByIdAndUpdate(
            req.params.id,
            updateData,
            {
                new: true,
                runValidators: true,
            }
        ).populate('addedBy', 'name').populate('lastModifiedBy', 'name');

        console.log('✅ Product updated successfully');
        res.json(updatedProduct);
    } catch (err) {
        console.error('❌ Error updating product:', err);
        res.status(400).json({ message: err.message });
    }
});

// GET EXPIRING PRODUCTS FOR NOTIFICATIONS
router.get('/expiring', authMiddleware, async (req, res) => {
    try {
        // Get user's current family
        const user = await User.findById(req.userId).select('currentFamilyId');
        const currentFamilyId = user?.currentFamilyId;

        if (!currentFamilyId) {
            return res.json({ expiring: [], expired: [] });
        }

        const today = new Date();
        const threeDaysFromNow = new Date(today);
        threeDaysFromNow.setDate(today.getDate() + 3);

        // Find items expiring in the next 3 days
        const expiringSoon = await PantryItem.find({
            familyId: currentFamilyId,
            expiryDate: {
                $gte: today,
                $lte: threeDaysFromNow
            },
            status: { $in: ['fresh', 'expiring'] },
            quantity: { $gt: 0 }
        }).sort({ expiryDate: 1 }).limit(10);

        // Find items already expired
        const alreadyExpired = await PantryItem.find({
            familyId: currentFamilyId,
            expiryDate: { $lt: today },
            status: { $in: ['fresh', 'expiring'] },
            quantity: { $gt: 0 }
        }).sort({ expiryDate: 1 }).limit(10);

        res.json({
            expiring: expiringSoon,
            expired: alreadyExpired
        });
    } catch (err) {
        console.error('Error fetching expiring products:', err);
        res.status(500).json({ message: err.message });
    }
});

// Helper function to check edit permissions for family items
async function checkEditPermission(product, userId) {
    // All items are family items now
    if (!product.familyId) {
        return false;
    }

    const family = await Family.findById(product.familyId);
    if (family && family.isMember(userId)) {
        return true; // All family members can edit shared items
    }

    return false;
}

module.exports = router;
