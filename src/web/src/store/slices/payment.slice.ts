/**
 * Payment Slice Implementation
 * Version: 1.0.0
 * 
 * Redux slice for managing payment state including family pool balance,
 * transaction history, payment methods, and pool utilization metrics.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.0
import {
  IPayment,
  IFamilyPool,
  IPaymentRequest,
  PaymentMethod,
  PaymentStatus
} from '../../interfaces/payment.interface';
import { paymentService } from '../../services/payment.service';

/**
 * Auto top-up configuration interface
 */
interface AutoTopUpConfig {
  enabled: boolean;
  threshold: number;
  amount: number;
}

/**
 * Payment state interface with enhanced metrics
 */
interface PaymentState {
  familyPool: IFamilyPool | null;
  transactions: IPayment[];
  paymentMethods: PaymentMethod[];
  poolUtilization: number;
  utilizationTarget: number;
  currencyPreferences: Record<string, string>;
  autoTopUpSettings: AutoTopUpConfig | null;
  transactionCache: Record<string, IPayment[]>;
  loading: boolean;
  error: string | null;
}

/**
 * Initial state with default values
 */
const initialState: PaymentState = {
  familyPool: null,
  transactions: [],
  paymentMethods: [],
  poolUtilization: 0,
  utilizationTarget: 70, // Target pool utilization percentage
  currencyPreferences: {},
  autoTopUpSettings: null,
  transactionCache: {},
  loading: false,
  error: null
};

/**
 * Payment slice with enhanced features and optimizations
 */
const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    setFamilyPool: (state, action: PayloadAction<IFamilyPool>) => {
      state.familyPool = action.payload;
      state.poolUtilization = calculatePoolUtilization(action.payload);
    },
    setTransactions: (state, action: PayloadAction<IPayment[]>) => {
      state.transactions = action.payload;
      // Update transaction cache
      const familyId = state.familyPool?.familyId;
      if (familyId) {
        state.transactionCache[familyId] = action.payload;
      }
    },
    setPaymentMethods: (state, action: PayloadAction<PaymentMethod[]>) => {
      state.paymentMethods = action.payload;
    },
    setPoolUtilization: (state, action: PayloadAction<number>) => {
      state.poolUtilization = action.payload;
    },
    setCurrencyPreferences: (state, action: PayloadAction<Record<string, string>>) => {
      state.currencyPreferences = action.payload;
    },
    setAutoTopUp: (state, action: PayloadAction<AutoTopUpConfig>) => {
      state.autoTopUpSettings = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    }
  }
});

/**
 * Calculate pool utilization percentage
 */
const calculatePoolUtilization = (pool: IFamilyPool): number => {
  if (!pool || pool.balance <= 0) return 0;
  const utilization = (pool.balance / pool.autoTopUpThreshold) * 100;
  return Math.min(utilization, 100);
};

/**
 * Async thunk for fetching family pool details
 */
export const fetchFamilyPool = (familyId: string) => async (dispatch: any) => {
  try {
    dispatch(setLoading(true));
    const pool = await paymentService.getFamilyPool(familyId);
    dispatch(setFamilyPool(pool));
    dispatch(setError(null));
  } catch (error: any) {
    dispatch(setError(error.message));
  } finally {
    dispatch(setLoading(false));
  }
};

/**
 * Async thunk for adding funds to family pool
 */
export const addFunds = (request: IPaymentRequest) => async (dispatch: any) => {
  try {
    dispatch(setLoading(true));
    
    // Optimistic update
    if (request.method === PaymentMethod.POOL) {
      const currentPool = { ...store.getState().payment.familyPool };
      if (currentPool) {
        currentPool.balance += request.amount;
        dispatch(setFamilyPool(currentPool));
      }
    }

    const payment = await paymentService.addFunds(request);
    
    if (payment.status === PaymentStatus.COMPLETED) {
      // Refresh pool balance
      await dispatch(fetchFamilyPool(request.familyId));
      
      // Update transactions
      const currentTransactions = store.getState().payment.transactions;
      dispatch(setTransactions([payment, ...currentTransactions]));
    }

    dispatch(setError(null));
  } catch (error: any) {
    dispatch(setError(error.message));
    // Rollback optimistic update
    if (request.method === PaymentMethod.POOL) {
      await dispatch(fetchFamilyPool(request.familyId));
    }
  } finally {
    dispatch(setLoading(false));
  }
};

/**
 * Selectors for accessing payment state
 */
export const paymentSelectors = {
  selectFamilyPool: (state: { payment: PaymentState }) => state.payment.familyPool,
  selectPoolUtilization: (state: { payment: PaymentState }) => state.payment.poolUtilization,
  selectTransactionsByDate: (state: { payment: PaymentState }, startDate: Date, endDate: Date) => {
    return state.payment.transactions.filter(transaction => {
      const txDate = new Date(transaction.createdAt);
      return txDate >= startDate && txDate <= endDate;
    });
  },
  selectCurrencyMetrics: (state: { payment: PaymentState }) => {
    const transactions = state.payment.transactions;
    return transactions.reduce((acc: Record<string, number>, tx) => {
      acc[tx.currency] = (acc[tx.currency] || 0) + tx.amount;
      return acc;
    }, {});
  }
};

export const {
  setFamilyPool,
  setTransactions,
  setPaymentMethods,
  setPoolUtilization,
  setCurrencyPreferences,
  setAutoTopUp,
  setLoading,
  setError
} = paymentSlice.actions;

export default paymentSlice.reducer;