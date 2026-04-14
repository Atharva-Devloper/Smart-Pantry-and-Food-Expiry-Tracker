const express = require('express');
const router = express.Router();
const { User, Family, PantryItem } = require('../models');
const { protect } = require('../utils/auth');

// Get user's families
router.get('/my-families', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // Find families where user is a member
    const families = await Family.find({ 'members.userId': userId })
      .populate('members.userId', 'name email')
      .select('-createdAt -updatedAt');

    // Get current family from user
    const user = await User.findById(userId).select('currentFamilyId');

    res.json({
      families,
      currentFamilyId: user.currentFamilyId
    });
  } catch (err) {
    console.error('Get families error:', err);
    res.status(500).json({ message: 'Failed to load family data' });
  }
});

// Create a new family
router.post('/create', protect, async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user._id;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'Family name must be at least 2 characters' });
    }

    // Generate join code
    function generateJoinCode() {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const timestamp = Date.now().toString(36).toUpperCase();
      let code = timestamp.slice(-4);
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code.substring(0, 8);
    }

    // Create family with user as owner
    const family = new Family({
      name: name.trim(),
      description: description?.trim() || '',
      joinCode: generateJoinCode(),
      members: [{
        userId,
        role: 'owner',
        joinedAt: new Date()
      }]
    });

    console.log('👨‍👩‍👧 Creating family:', name, 'with code:', family.joinCode);
    await family.save();
    console.log('✅ Family created with joinCode:', family.joinCode);

    // Update user's current family
    await User.findByIdAndUpdate(userId, { currentFamilyId: family._id });

    const populatedFamily = await Family.findById(family._id).populate('members.userId', 'name email');

    res.status(201).json({
      message: 'Family created successfully',
      family: populatedFamily,
      joinCode: family.joinCode
    });
  } catch (err) {
    console.error('❌ Create family error:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ message: 'Failed to create family: ' + err.message });
  }
});

// Join a family using code
router.post('/join-by-code', protect, async (req, res) => {
  try {
    const { joinCode } = req.body;
    const userId = req.user._id;

    if (!joinCode ||joinCode.trim().length === 0) {
      return res.status(400).json({ message: 'Family code is required' });
    }

    console.log(`🔗 Attempting to join family with code: ${joinCode.toUpperCase()}`);
    
    // Find family by code - case insensitive
    const family = await Family.findByJoinCode(joinCode.toUpperCase());

    if (!family) {
      console.log(`❌ Family code not found: ${joinCode}`);
      return res.status(404).json({ message: 'Family code not found. Please check and try again.' });
    }

    console.log(`✅ Found family: ${family.name}`);

    // Check if user is already a member
    if (family.isMember(userId)) {
      return res.status(400).json({ message: 'You are already a member of this family' });
    }

    // Add user to family as member
    family.members.push({
      userId,
      role: 'member',
      joinedAt: new Date()
    });

    await family.save();
    console.log(`✅ User added to family: ${family.name}`);

    // Update user's current family
    await User.findByIdAndUpdate(userId, { currentFamilyId: family._id });

    const populatedFamily = await Family.findById(family._id).populate('members.userId', 'name email');

    res.json({
      message: 'Successfully joined family!',
      family: populatedFamily,
      familyName: family.name
    });
  } catch (err) {
    console.error('❌ Join family error:', err);
    res.status(500).json({ message: 'Failed to join family' });
  }
});

// Switch current family (BEFORE wildcard /:familyId routes)
router.post('/switch/:familyId', protect, async (req, res) => {
  try {
    const { familyId } = req.params;
    const userId = req.user._id;

    console.log(`🔄 Switching to family: ${familyId}`);

    const family = await Family.findById(familyId);

    if (!family) {
      console.log(`❌ Family not found: ${familyId}`);
      return res.status(404).json({ message: 'Family not found' });
    }

    // Check if user is a member
    if (!family.isMember(userId)) {
      console.log(`❌ User ${userId} not a member of family ${familyId}`);
      return res.status(403).json({ message: 'Not authorized to switch to this family' });
    }

    // Update user's current family
    await User.findByIdAndUpdate(userId, { currentFamilyId: familyId });
    console.log(`✅ Switched to family: ${family.name}`);

    res.json({
      message: 'Switched to family successfully',
      familyId: family._id,
      familyName: family.name
    });
  } catch (err) {
    console.error('❌ Switch family error:', err);
    res.status(500).json({ message: 'Failed to switch family' });
  }
});

// Get family join code (owner/admin only)
router.get('/:familyId/join-code', protect, async (req, res) => {
  try {
    const { familyId } = req.params;
    const userId = req.user._id;

    console.log(`📋 Fetching join code for family: ${familyId}`);

    const family = await Family.findById(familyId);

    if (!family) {
      console.log(`❌ Family not found: ${familyId}`);
      return res.status(404).json({ message: 'Family not found' });
    }

    // Check if user is owner/admin
    if (!family.isAdmin(userId)) {
      console.log(`❌ User ${userId} is not admin of family ${familyId}`);
      return res.status(403).json({ message: 'Only family admin can view join code' });
    }

    if (!family.joinCode) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const timestamp = Date.now().toString(36).toUpperCase();
      let code = timestamp.slice(-4);
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      family.joinCode = code.substring(0, 8);
      await family.save();
      console.log(`✅ Generated missing join code for family: ${family.name}`);
    }

    console.log(`✅ Returning join code for family: ${family.name} - ${family.joinCode}`);
    res.json({
      familyId: family._id,
      familyName: family.name,
      joinCode: family.joinCode,
      memberCount: family.members.length
    });
  } catch (err) {
    console.error('❌ Get join code error:', err);
    res.status(500).json({ message: 'Failed to get join code' });
  }
});

// Leave a family
router.post('/:familyId/leave', protect, async (req, res) => {
  try {
    const { familyId } = req.params;
    const userId = req.user._id;

    const family = await Family.findById(familyId);

    if (!family) {
      return res.status(404).json({ message: 'Family not found' });
    }

    // Check if user is a member
    if (!family.isMember(userId)) {
      return res.status(400).json({ message: 'Not a member of this family' });
    }

    // Check if user is the only owner
    const owners = family.members.filter(m => m.role === 'owner');
    if (owners.length === 1 && family.getMemberRole(userId) === 'owner') {
      return res.status(400).json({ message: 'Cannot leave family as the only owner. Delete the family or assign ownership to another member.' });
    }

    // Remove user from family
    family.members = family.members.filter(m => m.userId.toString() !== userId.toString());
    await family.save();

    // If user was in this family, update current family
    const user = await User.findById(userId);
    if (user.currentFamilyId?.toString() === familyId) {
      const newFamily = await Family.findByMember(userId);
      await User.findByIdAndUpdate(userId, {
        currentFamilyId: newFamily.length > 0 ? newFamily[0]._id : null
      });
    }

    res.json({ message: 'Successfully left family' });
  } catch (err) {
    console.error('Leave family error:', err);
    res.status(500).json({ message: 'Failed to leave family' });
  }
});

// Remove a member (admin only)
router.post('/:familyId/remove-member/:memberId', protect, async (req, res) => {
  try {
    const { familyId, memberId } = req.params;
    const userId = req.user._id;

    const family = await Family.findById(familyId);

    if (!family) {
      return res.status(404).json({ message: 'Family not found' });
    }

    // Check if user has permission to remove members
    if (!family.isAdmin(userId)) {
      return res.status(403).json({ message: 'Not authorized to remove members' });
    }

    // Cannot remove owner
    const memberToRemove = family.members.find(m => m.userId.toString() === memberId);
    if (memberToRemove && memberToRemove.role === 'owner') {
      return res.status(400).json({ message: 'Cannot remove family owner' });
    }

    // Remove member
    family.members = family.members.filter(m => m.userId.toString() !== memberId);
    await family.save();

    // If removed user was viewing this family, update their current family
    const user = await User.findById(memberId);
    if (user && user.currentFamilyId?.toString() === familyId) {
      const newFamily = await Family.findByMember(memberId);
      await User.findByIdAndUpdate(memberId, {
        currentFamilyId: newFamily.length > 0 ? newFamily[0]._id : null
      });
    }

    res.json({ message: 'Member removed successfully' });
  } catch (err) {
    console.error('Remove member error:', err);
    res.status(500).json({ message: 'Failed to remove member' });
  }
});

// Delete family (owner only)
router.delete('/:familyId', protect, async (req, res) => {
  try {
    const { familyId } = req.params;
    const userId = req.user._id;

    const family = await Family.findById(familyId);

    if (!family) {
      return res.status(404).json({ message: 'Family not found' });
    }

    // Check if user is owner
    if (!family.isAdmin(userId) || family.getMemberRole(userId) !== 'owner') {
      return res.status(403).json({ message: 'Only family owner can delete family' });
    }

    // Delete family
    await Family.findByIdAndDelete(familyId);

    // Update all members' current family
    const memberIds = family.members.map(m => m.userId);
    for (const memberId of memberIds) {
      const newFamily = await Family.findByMember(memberId);
      await User.findByIdAndUpdate(memberId, {
        currentFamilyId: newFamily.length > 0 ? newFamily[0]._id : null
      });
    }

    res.json({ message: 'Family deleted successfully' });
  } catch (err) {
    console.error('Delete family error:', err);
    res.status(500).json({ message: 'Failed to delete family' });
  }
});

module.exports = router;
