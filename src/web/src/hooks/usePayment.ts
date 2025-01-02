/**
 * Custom React hook for managing payment operations and state
 * Version: 1.0.0
 * 
 * Provides comprehensive payment management functionality including:
 * - Family pool operations
 * - Transaction history
 * - Payment processing
 * - Pool utilization monitoring
 * - Real-time status updates
 */

import { useState, useEffect } from 'react'; // ^18.2.0
import { useDispatch, useSelector } from 'react-redux'; // ^8.0.0

import {
  IPayment,
  IFamilyPool,
  PaymentMethod,
  PaymentStatus
} from '../interfaces/payment.interface';

import {
  fetchFamilyPool,
  topUpFamilyPool,
  fetchTransactionHistory,
  selectFamilyPool,
  selectTransactions,
  selectPaymentLoading
} from '../store/slices/payment.slice';

// Payment validation states
enum ValidationState {
  IDLE = 'IDLE',
  VALIDATING = 'VALIDATING',
  VALID = 'VALID',
  INVALID = 'INVALID'
}

// Payment error types
interface PaymentError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Transaction filters
interface TransactionFilters {
  startDate?: Date;
  endDate?: Date;
  status?: PaymentStatus;
  method?: PaymentMethod;
}

// Hook options
interface UsePaymentOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  validateOnChange?: boolean;
}

/**
 * Custom hook for managing payment operations
 * @param familyId - The ID of the family
 * @param options - Configuration options for the hook
 */
export const usePayment = (
  familyId: string,
  options: UsePaymentOptions = {}
) => {
  const {
    autoRefresh = true,
    refreshInterval = 60000,
    validateOnChange = true
  } = options;

  // Redux hooks
  const dispatch = useDispatch();
  const familyPool = useSelector(selectFamilyPool);
  const transactions = useSelector(selectTransactions);
  const isLoading = useSelector(selectPaymentLoading);

  // Local state
  const [error, setError] = useState<PaymentError | null>(null);
  const [validationState, setValidationState] = useState<ValidationState>(ValidationState.IDLE);
  const [utilization, setUtilization] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(PaymentStatus.PENDING);

  /**
   * Calculates pool utilization percentage
   */
  const calculateUtilization = (pool: IFamilyPool | null): number => {
    if (!pool || pool.balance <= 0) return 0;
    const utilization = (pool.balance / pool.autoTopUpThreshold) * 100;
    return Math.min(utilization, 100);
  };

  /**
   * Validates payment parameters
   */
  const validatePayment = async (
    amount: number,
    method: PaymentMethod,
    currency?: string
  ): Promise<boolean> => {
    setValidationState(ValidationState.VALIDATING);
    
    try {
      // Amount validation
      if (amount <= 0) {
        throw { code: 'INVALID_AMOUNT', message: 'Amount must be greater than 0' };
      }

      // Currency validation
      const supportedCurrencies = ['USD', 'EUR', 'ILS', 'GBP', 'AUD'];
      if (currency && !supportedCurrencies.includes(currency)) {
        throw { code: 'INVALID_CURRENCY', message: 'Unsupported currency' };
      }

      // Method validation
      if (!Object.values(PaymentMethod).includes(method)) {
        throw { code: 'INVALID_METHOD', message: 'Invalid payment method' };
      }

      // Pool-specific validation
      if (method === PaymentMethod.POOL && (!familyPool || amount > familyPool.balance)) {
        throw { code: 'INSUFFICIENT_FUNDS', message: 'Insufficient pool balance' };
      }

      setValidationState(ValidationState.VALID);
      return true;
    } catch (error: any) {
      setValidationState(ValidationState.INVALID);
      setError(error);
      return false;
    }
  };

  /**
   * Adds funds to family pool
   */
  const topUpPool = async (
    amount: number,
    method: PaymentMethod,
    currency?: string
  ): Promise<void> => {
    try {
      setError(null);
      setPaymentStatus(PaymentStatus.PROCESSING);

      // Validate payment parameters
      if (validateOnChange) {
        const isValid = await validatePayment(amount, method, currency);
        if (!isValid) return;
      }

      // Process payment
      await dispatch(topUpFamilyPool({
        familyId,
        amount,
        method,
        currency: currency || familyPool?.currency || 'USD',
        metadata: {
          timestamp: new Date().toISOString(),
          type: 'TOP_UP'
        }
      }));

      setPaymentStatus(PaymentStatus.COMPLETED);
      await refreshPool();
    } catch (error: any) {
      setError({
        code: 'PAYMENT_FAILED',
        message: error.message,
        details: error.details
      });
      setPaymentStatus(PaymentStatus.FAILED);
    }
  };

  /**
   * Refreshes family pool data
   */
  const refreshPool = async (): Promise<void> => {
    try {
      setError(null);
      await dispatch(fetchFamilyPool(familyId));
      
      if (familyPool) {
        setUtilization(calculateUtilization(familyPool));
      }
    } catch (error: any) {
      setError({
        code: 'REFRESH_FAILED',
        message: error.message
      });
    }
  };

  /**
   * Loads transaction history with optional filters
   */
  const loadTransactions = async (filters?: TransactionFilters): Promise<void> => {
    try {
      setError(null);
      await dispatch(fetchTransactionHistory({ familyId, ...filters }));
    } catch (error: any) {
      setError({
        code: 'TRANSACTION_LOAD_FAILED',
        message: error.message
      });
    }
  };

  // Set up automatic refresh
  useEffect(() => {
    if (autoRefresh) {
      const intervalId = setInterval(refreshPool, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [autoRefresh, refreshInterval, familyId]);

  // Update utilization when pool changes
  useEffect(() => {
    if (familyPool) {
      setUtilization(calculateUtilization(familyPool));
    }
  }, [familyPool]);

  // Return hook interface
  return {
    familyPool,
    transactions,
    isLoading,
    topUpPool,
    refreshPool,
    loadTransactions,
    error,
    utilization,
    validationState,
    paymentStatus
  };
};