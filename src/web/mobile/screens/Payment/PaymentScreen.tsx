/**
 * PaymentScreen Component
 * Version: 1.0.0
 * 
 * Mobile screen component for managing family pool payments and transactions
 * with support for multi-currency, accessibility, and responsive design.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  VirtualizedList
} from 'react-native';
import analytics from '@analytics/react-native'; // latest

import {
  usePayment,
  PaymentError,
  PaymentMethod,
  IPayment,
  IFamilyPool
} from '../../../hooks/usePayment';
import SafeAreaViewWrapper from '../../components/common/SafeAreaView/SafeAreaView';
import { scale, verticalScale, moderateScale } from '../../../styles/responsive';
import { isTablet } from '../../../utils/platform.util';

// Analytics tracking events
const ANALYTICS_EVENTS = {
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_COMPLETED: 'payment_completed',
  PAYMENT_FAILED: 'payment_failed'
};

interface PaymentScreenProps {
  familyId: string;
  onClose?: () => void;
}

/**
 * Enhanced PaymentScreen component with comprehensive payment functionality
 */
const PaymentScreen: React.FC<PaymentScreenProps> = ({ familyId, onClose }) => {
  // Payment hook integration
  const {
    familyPool,
    transactions,
    isLoading,
    topUpPool,
    error,
    utilization
  } = usePayment(familyId, { autoRefresh: true });

  // Local state management
  const [amount, setAmount] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(PaymentMethod.STRIPE);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);

  /**
   * Formats currency amount based on locale and currency
   */
  const formatCurrency = useCallback((value: number, currency: string = 'USD'): string => {
    try {
      return new Intl.NumberFormat(Platform.select({
        ios: 'en-US',
        android: 'en-US'
      }), {
        style: 'currency',
        currency: currency
      }).format(value / 100); // Convert cents to dollars
    } catch (error) {
      console.error('Currency formatting error:', error);
      return `${currency} ${(value / 100).toFixed(2)}`;
    }
  }, []);

  /**
   * Memoized pool balance display
   */
  const poolBalance = useMemo(() => {
    if (!familyPool) return null;
    return formatCurrency(familyPool.balance, familyPool.currency);
  }, [familyPool, formatCurrency]);

  /**
   * Handles pool top-up operation
   */
  const handleTopUp = useCallback(async () => {
    try {
      setIsProcessing(true);
      setLocalError(null);

      // Validate amount
      const numericAmount = parseFloat(amount) * 100; // Convert to cents
      if (isNaN(numericAmount) || numericAmount <= 0) {
        throw new Error('Invalid amount');
      }

      // Track payment initiation
      analytics.track(ANALYTICS_EVENTS.PAYMENT_INITIATED, {
        amount: numericAmount,
        currency: familyPool?.currency,
        method: selectedMethod
      });

      // Process payment
      await topUpPool(numericAmount, selectedMethod, familyPool?.currency);

      // Track success
      analytics.track(ANALYTICS_EVENTS.PAYMENT_COMPLETED, {
        amount: numericAmount,
        currency: familyPool?.currency
      });

      // Reset form
      setAmount('');
      setIsProcessing(false);
    } catch (error: any) {
      setLocalError(error.message);
      setIsProcessing(false);

      // Track failure
      analytics.track(ANALYTICS_EVENTS.PAYMENT_FAILED, {
        error: error.message,
        amount: amount,
        method: selectedMethod
      });
    }
  }, [amount, selectedMethod, familyPool, topUpPool]);

  /**
   * Renders individual transaction item
   */
  const renderTransaction = useCallback(({ item }: { item: IPayment }) => {
    const formattedAmount = formatCurrency(item.amount, item.currency);
    const formattedDate = new Date(item.createdAt).toLocaleDateString();

    return (
      <View style={styles.transactionItem} accessible={true}>
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionDate} accessibilityLabel={`Transaction date ${formattedDate}`}>
            {formattedDate}
          </Text>
          <Text style={styles.transactionMethod} accessibilityLabel={`Payment method ${item.method}`}>
            {item.method}
          </Text>
        </View>
        <Text 
          style={[
            styles.transactionAmount,
            { color: item.amount > 0 ? colors.success : colors.error }
          ]}
          accessibilityLabel={`Amount ${formattedAmount}`}
        >
          {formattedAmount}
        </Text>
      </View>
    );
  }, [formatCurrency]);

  /**
   * Renders payment methods selection
   */
  const renderPaymentMethods = useMemo(() => (
    <View style={styles.methodsContainer}>
      {Object.values(PaymentMethod).map((method) => (
        <TouchableOpacity
          key={method}
          style={[
            styles.methodButton,
            selectedMethod === method && styles.methodButtonSelected
          ]}
          onPress={() => setSelectedMethod(method)}
          accessibilityRole="radio"
          accessibilityState={{ checked: selectedMethod === method }}
        >
          <Text style={styles.methodButtonText}>{method}</Text>
        </TouchableOpacity>
      ))}
    </View>
  ), [selectedMethod]);

  return (
    <SafeAreaViewWrapper style={styles.container} respectRTL={true} isTablet={isTablet()}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Pool Balance Section */}
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Family Pool Balance</Text>
          <Text style={styles.balanceAmount}>{poolBalance || 'Loading...'}</Text>
          {utilization && (
            <View style={styles.utilizationBar}>
              <View style={[styles.utilizationFill, { width: `${utilization}%` }]} />
            </View>
          )}
        </View>

        {/* Top Up Section */}
        <View style={styles.topUpContainer}>
          <Text style={styles.sectionTitle}>Add Funds</Text>
          {renderPaymentMethods}
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="Enter amount"
            accessibilityLabel="Enter amount to add"
            editable={!isProcessing}
          />
          <TouchableOpacity
            style={[styles.topUpButton, isProcessing && styles.topUpButtonDisabled]}
            onPress={handleTopUp}
            disabled={isProcessing || !amount}
            accessibilityRole="button"
            accessibilityLabel="Add funds to family pool"
            accessibilityState={{ disabled: isProcessing || !amount }}
          >
            {isProcessing ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.topUpButtonText}>Add Funds</Text>
            )}
          </TouchableOpacity>
          {(localError || error) && (
            <Text style={styles.errorText} accessibilityRole="alert">
              {localError || error?.message}
            </Text>
          )}
        </View>

        {/* Transactions Section */}
        <View style={styles.transactionsContainer}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <VirtualizedList
            data={transactions}
            renderItem={renderTransaction}
            keyExtractor={(item: IPayment) => item.id}
            getItemCount={(data) => data?.length ?? 0}
            getItem={(data, index) => data[index]}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            style={styles.transactionsList}
          />
        </View>
      </ScrollView>
    </SafeAreaViewWrapper>
  );
};

const colors = {
  primary: '#2196F3',
  success: '#4CAF50',
  error: '#F44336',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#757575',
  lightGray: '#E0E0E0',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: scale(16),
  },
  balanceContainer: {
    marginBottom: verticalScale(24),
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: moderateScale(16),
    color: colors.gray,
    marginBottom: verticalScale(8),
  },
  balanceAmount: {
    fontSize: moderateScale(32),
    fontWeight: 'bold',
    color: colors.black,
    marginBottom: verticalScale(16),
  },
  utilizationBar: {
    width: '100%',
    height: verticalScale(8),
    backgroundColor: colors.lightGray,
    borderRadius: scale(4),
    overflow: 'hidden',
  },
  utilizationFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  topUpContainer: {
    marginBottom: verticalScale(24),
  },
  sectionTitle: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    marginBottom: verticalScale(16),
    color: colors.black,
  },
  methodsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: verticalScale(16),
  },
  methodButton: {
    padding: scale(12),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: colors.primary,
    marginRight: scale(8),
    marginBottom: scale(8),
  },
  methodButtonSelected: {
    backgroundColor: colors.primary,
  },
  methodButtonText: {
    color: colors.primary,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: scale(8),
    padding: scale(12),
    fontSize: moderateScale(16),
    marginBottom: verticalScale(16),
  },
  topUpButton: {
    backgroundColor: colors.primary,
    padding: scale(16),
    borderRadius: scale(8),
    alignItems: 'center',
  },
  topUpButtonDisabled: {
    opacity: 0.5,
  },
  topUpButtonText: {
    color: colors.white,
    fontSize: moderateScale(16),
    fontWeight: 'bold',
  },
  errorText: {
    color: colors.error,
    marginTop: verticalScale(8),
    fontSize: moderateScale(14),
  },
  transactionsContainer: {
    flex: 1,
  },
  transactionsList: {
    flex: 1,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDate: {
    fontSize: moderateScale(14),
    color: colors.black,
  },
  transactionMethod: {
    fontSize: moderateScale(12),
    color: colors.gray,
    marginTop: verticalScale(4),
  },
  transactionAmount: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
  },
});

export default PaymentScreen;