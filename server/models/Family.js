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
  joinCode: {
    type: String,
    unique: true,
    sparse: true,
    minlength: 6,
    maxlength: 12
  },
  settings: {
    allowMembersToInvite: {
      type: Boolean,
      default: true
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

// Static method to find family by join code
familySchema.statics.findByJoinCode = function(code) {
  return this.findOne({ joinCode: code.toUpperCase() });
};

// Generate a unique join code with timestamp and randomness
function generateJoinCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const timestamp = Date.now().toString(36).toUpperCase();
  let code = timestamp.slice(-4); // Take last 4 chars of timestamp
  
  // Add 4 random characters for uniqueness
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return code.substring(0, 8);
}

const Family = mongoose.model('Family', familySchema);

module.exports = Family;
