/**
 * @fileoverview Mongoose model and schema for payment transactions in MyFamily platform
 * @version 1.0.0
 * @package mongoose ^6.9.0
 */

import { Schema, model, Document, HookNextFunction } from 'mongoose';
import {
  IPayment,
  PaymentMethod,
  PaymentStatus,
  SupportedCurrency,
  isSupportedCurrency,
  isPaymentMethod,
  isPaymentStatus
} from '../../../shared/interfaces/payment.interface';

// Constants for validation
const MINIMUM_PAYMENT_AMOUNT = 0.01;
const MAXIMUM_PAYMENT_AMOUNT = 10000;
const TARGET_POOL_UTILIZATION = 0.70;

/**
 * Mongoose schema for payment transactions with enhanced validation
 */
const PaymentSchema = new Schema<IPayment>({
  familyId: {
    type: String,
    required: [true, 'Family ID is required'],
    index: true
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [MINIMUM_PAYMENT_AMOUNT, 'Payment amount must be positive'],
    max: [MAXIMUM_PAYMENT_AMOUNT, 'Payment amount exceeds maximum limit']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    enum: {
      values: Object.values(SupportedCurrency),
      message: 'Invalid currency specified'
    }
  },
  method: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: {
      values: Object.values(PaymentMethod),
      message: 'Invalid payment method'
    }
  },
  status: {
    type: String,
    required: [true, 'Payment status is required'],
    enum: {
      values: Object.values(PaymentStatus),
      message: 'Invalid payment status'
    },
    default: PaymentStatus.PENDING
  },
  description: {
    type: String,
    required: [true, 'Payment description is required'],
    trim: true,
    maxlength: [500, 'Description too long']
  },
  promoCode: {
    type: String,
    trim: true,
    sparse: true,
    uppercase: true,
    index: true
  },
  errorDetails: {
    type: String,
    default: null
  },
  utilizationRate: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for query optimization
PaymentSchema.index({ familyId: 1, createdAt: -1 });
PaymentSchema.index({ status: 1, method: 1 });
PaymentSchema.index({ currency: 1, createdAt: -1 });

/**
 * Pre-save hook for payment validation
 */
PaymentSchema.pre('save', async function(next: HookNextFunction) {
  try {
    // Validate currency
    if (!isSupportedCurrency(this.currency)) {
      throw new Error('Unsupported currency');
    }

    // Validate payment method
    if (!isPaymentMethod(this.method)) {
      throw new Error('Invalid payment method');
    }

    // Validate status
    if (!isPaymentStatus(this.status)) {
      throw new Error('Invalid payment status');
    }

    // Validate payment method and currency combination
    if (this.method === PaymentMethod.TRANZILLIA && this.currency !== SupportedCurrency.ILS) {
      throw new Error('Tranzillia only supports ILS currency');
    }

    // Validate status transition
    if (this.isModified('status')) {
      const validTransitions: Record<PaymentStatus, PaymentStatus[]> = {
        [PaymentStatus.PENDING]: [PaymentStatus.PROCESSING, PaymentStatus.FAILED],
        [PaymentStatus.PROCESSING]: [PaymentStatus.COMPLETED, PaymentStatus.FAILED],
        [PaymentStatus.COMPLETED]: [PaymentStatus.REFUNDED],
        [PaymentStatus.FAILED]: [PaymentStatus.PENDING],
        [PaymentStatus.REFUNDED]: []
      };

      const currentStatus = this.status;
      const previousStatus = this._previousStatus || PaymentStatus.PENDING;

      if (!validTransitions[previousStatus].includes(currentStatus)) {
        throw new Error(`Invalid status transition from ${previousStatus} to ${currentStatus}`);
      }
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

/**
 * Post-save hook for pool balance updates
 */
PaymentSchema.post('save', async function(doc: IPayment & Document) {
  if (doc.status === PaymentStatus.COMPLETED) {
    try {
      // Update pool utilization metrics
      const utilizationRate = await calculatePoolUtilization(doc.familyId);
      await model('Payment').updateOne(
        { _id: doc._id },
        { utilizationRate }
      );

      // Emit pool update event for real-time updates
      if (process.env.NODE_ENV !== 'test') {
        global.eventEmitter.emit('poolUpdate', {
          familyId: doc.familyId,
          utilizationRate
        });
      }
    } catch (error) {
      console.error('Pool update error:', error);
    }
  }
});

/**
 * Calculate pool utilization rate
 */
async function calculatePoolUtilization(familyId: string): Promise<number> {
  const aggregation = await model('Payment').aggregate([
    { $match: { familyId, status: PaymentStatus.COMPLETED } },
    { $group: {
      _id: null,
      totalAmount: { $sum: '$amount' },
      count: { $sum: 1 }
    }}
  ]);

  if (!aggregation.length) return 0;

  const { totalAmount, count } = aggregation[0];
  const utilizationRate = count > 0 ? totalAmount / (count * TARGET_POOL_UTILIZATION) : 0;
  return Math.min(Math.max(utilizationRate, 0), 1);
}

/**
 * Virtual for formatted amount with currency
 */
PaymentSchema.virtual('formattedAmount').get(function() {
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: this.currency
  });
  return formatter.format(this.amount);
});

// Create and export the model
const Payment = model<IPayment>('Payment', PaymentSchema);
export { PaymentSchema, Payment as default };