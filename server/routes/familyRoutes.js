const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { User, Family, PantryItem } = require('../models');
const { protect } = require('../utils/auth');

// Generate unique invitation token
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Get user's families and pending invitations
router.get('/my-families', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const userEmail = req.user.email.toLowerCase();

    // Find families where user is a member
    const families = await Family.find({ 'members.userId': userId })
      .populate('members.userId', 'name email')
      .select('-invitations');

    // Find pending invitations for this user
    const familiesWithInvitations = await Family.find({
      'invitations.email': userEmail,
      'invitations.status': 'pending'
    }).select('name invitations');

    const pendingInvitations = familiesWithInvitations.map(family => {
      const invitation = family.invitations.find(
        inv => inv.email.toLowerCase() === userEmail && inv.status === 'pending'
      );
      return {
        familyId: family._id,
        familyName: family.name,
        invitationId: invitation._id,
        role: invitation.role,
        invitedBy: invitation.invitedBy,
        expiresAt: invitation.expiresAt,
        token: invitation.token
      };
    });

    // Get current family from user
    const user = await User.findById(userId).select('currentFamilyId');

    res.json({
      families,
      pendingInvitations,
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

    // Create family with user as owner
    const family = new Family({
      name: name.trim(),
      description: description?.trim() || '',
      members: [{
        userId,
        role: 'owner',
        joinedAt: new Date()
      }]
    });

    await family.save();

    // Update user's current family
    await User.findByIdAndUpdate(userId, { currentFamilyId: family._id });

    res.status(201).json({
      message: 'Family created successfully',
      family: await Family.findById(family._id).populate('members.userId', 'name email')
    });
  } catch (err) {
    console.error('Create family error:', err);
    res.status(500).json({ message: 'Failed to create family' });
  }
});

// Invite a member to family
router.post('/:familyId/invite', protect, async (req, res) => {
  try {
    const { familyId } = req.params;
    const { email, role = 'member' } = req.body;
    const userId = req.user._id;

    const family = await Family.findById(familyId);
    if (!family) {
      return res.status(404).json({ message: 'Family not found' });
    }

    // Check if user has permission to invite
    if (!family.isAdmin(userId) && !family.settings.allowMembersToInvite) {
      return res.status(403).json({ message: 'Not authorized to invite members' });
    }

    // Check if email is already a member
    const invitedUser = await User.findOne({ email: email.toLowerCase() });
    if (invitedUser && family.isMember(invitedUser._id)) {
      return res.status(400).json({ message: 'User is already a member of this family' });
    }

    // Check if there's already a pending invitation
    const existingInvitation = family.invitations.find(
      inv => inv.email === email.toLowerCase() && inv.status === 'pending'
    );
    if (existingInvitation) {
      return res.status(400).json({ message: 'Invitation already sent to this email' });
    }

    // Create invitation
    const token = generateToken();
    family.invitations.push({
      email: email.toLowerCase(),
      invitedBy: userId,
      token,
      role,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    await family.save();

    res.json({
      message: 'Invitation sent successfully',
      invitation: {
        email: email.toLowerCase(),
        role,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
  } catch (err) {
    console.error('Invite member error:', err);
    res.status(500).json({ message: 'Failed to send invitation' });
  }
});

// Accept invitation
router.post('/accept-invitation/:token', protect, async (req, res) => {
  try {
    const { token } = req.params;
    const userId = req.user._id;
    const userEmail = req.user.email.toLowerCase();

    const family = await Family.findOne({
      'invitations.token': token,
      'invitations.email': userEmail,
      'invitations.status': 'pending'
    });

    if (!family) {
      return res.status(404).json({ message: 'Invitation not found or expired' });
    }

    const invitation = family.invitations.find(
      inv => inv.token === token && inv.email.toLowerCase() === userEmail
    );

    // Check if invitation expired
    if (new Date() > invitation.expiresAt) {
      invitation.status = 'expired';
      await family.save();
      return res.status(400).json({ message: 'Invitation has expired' });
    }

    // Check if already a member
    if (family.isMember(userId)) {
      return res.status(400).json({ message: 'You are already a member of this family' });
    }

    // Add user to family
    family.members.push({
      userId,
      role: invitation.role,
      joinedAt: new Date()
    });

    // Update invitation status
    invitation.status = 'accepted';

    await family.save();

    // Update user's current family
    await User.findByIdAndUpdate(userId, { currentFamilyId: family._id });

    res.json({
      message: 'Successfully joined family',
      family: await Family.findById(family._id).populate('members.userId', 'name email')
    });
  } catch (err) {
    console.error('Accept invitation error:', err);
    res.status(500).json({ message: 'Failed to accept invitation' });
  }
});

// Reject invitation
router.post('/reject-invitation/:token', protect, async (req, res) => {
  try {
    const { token } = req.params;
    const userEmail = req.user.email.toLowerCase();

    const family = await Family.findOne({
      'invitations.token': token,
      'invitations.email': userEmail,
      'invitations.status': 'pending'
    });

    if (!family) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    const invitation = family.invitations.find(inv => inv.token === token);
    invitation.status = 'rejected';
    await family.save();

    res.json({ message: 'Invitation rejected' });
  } catch (err) {
    console.error('Reject invitation error:', err);
    res.status(500).json({ message: 'Failed to reject invitation' });
  }
});

// Switch current family
router.post('/switch/:familyId', protect, async (req, res) => {
  try {
    const { familyId } = req.params;
    const userId = req.user._id;

    // Validate family exists and user is a member
    const family = await Family.findById(familyId);
    if (!family) {
      return res.status(404).json({ message: 'Family not found' });
    }

    if (!family.isMember(userId)) {
      return res.status(403).json({ message: 'You are not a member of this family' });
    }

    // Update user's current family
    await User.findByIdAndUpdate(userId, { currentFamilyId: familyId });

    res.json({
      message: 'Family switched successfully',
      currentFamilyId: familyId
    });
  } catch (err) {
    console.error('Switch family error:', err);
    res.status(500).json({ message: 'Failed to switch family' });
  }
});

// Leave family
router.post('/:familyId/leave', protect, async (req, res) => {
  try {
    const { familyId } = req.params;
    const userId = req.user._id;

    const family = await Family.findById(familyId);
    if (!family) {
      return res.status(404).json({ message: 'Family not found' });
    }

    // Check if user is the owner
    const member = family.members.find(m => m.userId.toString() === userId.toString());
    if (member && member.role === 'owner') {
      return res.status(400).json({ message: 'Owner cannot leave the family. Transfer ownership first or delete the family.' });
    }

    // Remove user from family
    family.members = family.members.filter(m => m.userId.toString() !== userId.toString());
    await family.save();

    // Clear user's current family if it was this one
    const user = await User.findById(userId);
    if (user.currentFamilyId && user.currentFamilyId.toString() === familyId) {
      await User.findByIdAndUpdate(userId, { currentFamilyId: null });
    }

    res.json({ message: 'Successfully left family' });
  } catch (err) {
    console.error('Leave family error:', err);
    res.status(500).json({ message: 'Failed to leave family' });
  }
});

// Remove member from family (admin only)
router.post('/:familyId/remove-member/:memberId', protect, async (req, res) => {
  try {
    const { familyId, memberId } = req.params;
    const userId = req.user._id;

    const family = await Family.findById(familyId);
    if (!family) {
      return res.status(404).json({ message: 'Family not found' });
    }

    // Check if user is admin/owner
    if (!family.isAdmin(userId)) {
      return res.status(403).json({ message: 'Not authorized to remove members' });
    }

    // Cannot remove owner
    const memberToRemove = family.members.find(m => m.userId.toString() === memberId);
    if (memberToRemove && memberToRemove.role === 'owner') {
      return res.status(400).json({ message: 'Cannot remove the owner' });
    }

    // Remove member
    family.members = family.members.filter(m => m.userId.toString() !== memberId);
    await family.save();

    // Clear removed user's current family
    await User.findByIdAndUpdate(memberId, { currentFamilyId: null });

    res.json({ message: 'Member removed successfully' });
  } catch (err) {
    console.error('Remove member error:', err);
    res.status(500).json({ message: 'Failed to remove member' });
  }
});

// Update family settings (admin only)
router.put('/:familyId/settings', protect, async (req, res) => {
  try {
    const { familyId } = req.params;
    const { allowMembersToInvite, allowMembersToDelete, name, description } = req.body;
    const userId = req.user._id;

    const family = await Family.findById(familyId);
    if (!family) {
      return res.status(404).json({ message: 'Family not found' });
    }

    // Check if user is admin/owner
    if (!family.isAdmin(userId)) {
      return res.status(403).json({ message: 'Not authorized to update settings' });
    }

    // Update fields
    if (name) family.name = name.trim();
    if (description !== undefined) family.description = description.trim();
    if (allowMembersToInvite !== undefined) family.settings.allowMembersToInvite = allowMembersToInvite;
    if (allowMembersToDelete !== undefined) family.settings.allowMembersToDelete = allowMembersToDelete;

    await family.save();

    res.json({
      message: 'Settings updated successfully',
      family: await Family.findById(familyId).populate('members.userId', 'name email')
    });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ message: 'Failed to update settings' });
  }
});

// Get family pantry items (shared items)
router.get('/:familyId/pantry', protect, async (req, res) => {
  try {
    const { familyId } = req.params;
    const userId = req.user._id;

    const family = await Family.findById(familyId);
    if (!family) {
      return res.status(404).json({ message: 'Family not found' });
    }

    // Check if user is a member
    if (!family.isMember(userId)) {
      return res.status(403).json({ message: 'Not authorized to view family pantry' });
    }

    // Get family pantry items
    const items = await PantryItem.find({ familyId })
      .populate('addedBy', 'name')
      .populate('lastModifiedBy', 'name')
      .sort({ expiryDate: 1 });

    res.json(items);
  } catch (err) {
    console.error('Get family pantry error:', err);
    res.status(500).json({ message: 'Failed to load family pantry' });
  }
});

// Get family details
router.get('/:familyId', protect, async (req, res) => {
  try {
    const { familyId } = req.params;
    const userId = req.user._id;

    const family = await Family.findById(familyId)
      .populate('members.userId', 'name email')
      .populate('invitations.invitedBy', 'name');

    if (!family) {
      return res.status(404).json({ message: 'Family not found' });
    }

    // Check if user is a member
    if (!family.isMember(userId)) {
      return res.status(403).json({ message: 'Not authorized to view this family' });
    }

    res.json(family);
  } catch (err) {
    console.error('Get family error:', err);
    res.status(500).json({ message: 'Failed to load family details' });
  }
});

module.exports = router;
