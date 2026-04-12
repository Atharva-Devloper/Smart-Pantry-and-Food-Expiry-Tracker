const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    currentFamilyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Family',
      default: null,
    },
    preferences: {
      dietaryRestrictions: [
        {
          type: String,
          enum: [
            'vegan',
            'vegetarian',
            'gluten-free',
            'dairy-free',
            'nut-free',
            'none',
          ],
          default: 'none',
        },
      ],
      notificationSettings: {
        expiryWarnings: { type: Boolean, default: true },
        lowStockAlerts: { type: Boolean, default: true },
      },
      defaultStorageLocation: {
        type: String,
        enum: ['fridge', 'freezer', 'pantry', 'cupboard'],
        default: 'pantry',
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        return ret;
      },
    },
  }
);

// Hash password before saving - use async function
userSchema.pre('save', async function () {
  const user = this;

  // Only hash if password is modified
  if (!user.isModified('password')) {
    return;
  }

  try {
    console.log('🔐 Hashing password...');
    // Generate salt and hash
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    console.log('✅ Password hashed successfully');
  } catch (err) {
    console.error('❌ Password hashing error:', err);
    throw err;
  }
});

// Compare password method
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
