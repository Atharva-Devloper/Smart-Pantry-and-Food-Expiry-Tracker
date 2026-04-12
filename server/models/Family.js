const mongoose = require('mongoose');

const familyMemberSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'member'],
    default: 'member'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const invitationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'member'
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  }
}, { _id: true });

const familySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  members: [familyMemberSchema],
  invitations: [invitationSchema],
  settings: {
    allowMembersToInvite: {
      type: Boolean,
      default: false
    },
    allowMembersToDelete: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Instance method to check if user is a member
familySchema.methods.isMember = function(userId) {
  return this.members.some(member => member.userId.toString() === userId.toString());
};

// Instance method to check if user has admin/owner privileges
familySchema.methods.isAdmin = function(userId) {
  const member = this.members.find(m => m.userId.toString() === userId.toString());
  return member && (member.role === 'owner' || member.role === 'admin');
};

// Instance method to get member role
familySchema.methods.getMemberRole = function(userId) {
  const member = this.members.find(m => m.userId.toString() === userId.toString());
  return member ? member.role : null;
};

// Static method to find families a user belongs to
familySchema.statics.findByMember = function(userId) {
  return this.find({ 'members.userId': userId });
};

// Static method to find family by invitation token
familySchema.statics.findByInvitationToken = function(token) {
  return this.findOne({ 'invitations.token': token, 'invitations.status': 'pending' });
};

const Family = mongoose.model('Family', familySchema);

module.exports = Family;
