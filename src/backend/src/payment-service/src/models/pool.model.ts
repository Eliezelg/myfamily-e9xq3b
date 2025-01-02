/**
 * @fileoverview Mongoose model for family payment pools
 * @version 1.0.0
 * @package mongoose ^6.9.0
 */

import mongoose, { Schema } from 'mongoose';
import { IFamilyPool, SupportedCurrency } from '../../../shared/interfaces/payment.interface';

/**
 * Schema definition for family payment pools
 */
const FamilyPoolSchema = new Schema<IFamilyPool>({
  familyId: {
    type: Schema.Types.ObjectId,
    required: [true, 'Family ID is required'],
    ref: 'Family',
    immutable: true
  },
  balance: {
    type: Number,
    required: [true, 'Balance is required'],
    validate: {
      validator: function(value: number): boolean {
        return value >= 0;
      },
      message: 'Balance cannot be negative'
    },
    default: 0
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    enum: {
      values: Object.values(SupportedCurrency),
      message: 'Invalid currency specified'
    }
  },
  lastTopUpDate: {
    type: Date,
    default: null
  },
  lastGazetteCharge: {
    type: Number,
    default: 0
  },
  autoTopUp: {
    type: Boolean,
    default: false
  },
  autoTopUpThreshold: {
    type: Number,
    validate: {
      validator: function(value: number): boolean {
        return !this.autoTopUp || value > 0;
      },
      message: 'Auto top-up threshold must be greater than 0'
    },
    default: 0
  },
  autoTopUpAmount: {
    type: Number,
    validate: {
      validator: function(value: number): boolean {
        return !this.autoTopUp || value > 0;
      },
      message: 'Auto top-up amount must be greater than 0'
    },
    default: 0
  },
  utilizationRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  version: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  collection: 'family_pools',
  optimisticConcurrency: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true
  }
});

/**
 * Indexes for optimizing queries and ensuring data integrity
 */
FamilyPoolSchema.index({ familyId: 1 }, { unique: true });
FamilyPoolSchema.index({ balance: 1, currency: 1 }, { sparse: true });
FamilyPoolSchema.index({ utilizationRate: -1 }, { sparse: true });

/**
 * Pre-save middleware to update utilization rate
 */
FamilyPoolSchema.pre('save', async function(next) {
  if (this.isModified('lastGazetteCharge') || this.isModified('balance')) {
    this.utilizationRate = await this.calculateUtilizationRate();
  }
  next();
});

/**
 * Method to calculate pool utilization rate
 */
FamilyPoolSchema.methods.calculateUtilizationRate = async function(): Promise<number> {
  if (this.balance <= 0) return 0;
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const totalCharges = await this.model('FamilyPool').aggregate([
    {
      $match: {
        familyId: this.familyId,
        createdAt: { $gte: thirtyDaysAgo }
      }
    },
    {
      $group: {
        _id: null,
        totalCharges: { $sum: '$lastGazetteCharge' }
      }
    }
  ]);

  const charges = totalCharges[0]?.totalCharges || 0;
  return Math.min(Math.round((charges / this.balance) * 100), 100);
};

/**
 * Virtual for next auto top-up date
 */
FamilyPoolSchema.virtual('nextAutoTopUpDate').get(function() {
  if (!this.autoTopUp || !this.lastTopUpDate) return null;
  const nextDate = new Date(this.lastTopUpDate);
  nextDate.setMonth(nextDate.getMonth() + 1);
  return nextDate;
});

/**
 * Virtual for available balance after pending charges
 */
FamilyPoolSchema.virtual('availableBalance').get(function() {
  return Math.max(0, this.balance - (this.lastGazetteCharge || 0));
});

/**
 * Export the Mongoose model
 */
export const FamilyPool = mongoose.model<IFamilyPool>('FamilyPool', FamilyPoolSchema);