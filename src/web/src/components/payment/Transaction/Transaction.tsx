import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { IPayment, PaymentStatus } from '../../../interfaces/payment.interface';
import {
  TransactionContainer,
  TransactionInfo,
  TransactionAmount,
  TransactionDate,
  TransactionStatus
} from './Transaction.styles';
import { formatDate } from '../../../utils/date.util';
import { formatCurrency } from '../../../utils/format.util';
import { COLORS } from '../../../styles/theme.styles';

// Types
interface TransactionProps {
  transaction: IPayment;
  onClick?: (transaction: IPayment) => void;
  isRTL?: boolean;
}

// Status color mapping with high contrast support
const getStatusColor = (status: PaymentStatus, highContrast: boolean = false): string => {
  switch (status) {
    case PaymentStatus.COMPLETED:
      return highContrast ? COLORS.success.dark : COLORS.success.main;
    case PaymentStatus.PENDING:
      return highContrast ? COLORS.secondary.dark : COLORS.secondary.main;
    case PaymentStatus.PROCESSING:
      return highContrast ? COLORS.primary.dark : COLORS.primary.main;
    case PaymentStatus.FAILED:
      return highContrast ? COLORS.error.dark : COLORS.error.main;
    case PaymentStatus.REFUNDED:
      return highContrast ? COLORS.text.primary : COLORS.text.secondary;
    default:
      return COLORS.text.secondary;
  }
};

// Transaction type determination
const getTransactionType = (transaction: IPayment): 'credit' | 'debit' => {
  const { metadata, method } = transaction;
  
  if (method === 'POOL') {
    return metadata?.direction === 'in' ? 'credit' : 'debit';
  }
  
  return metadata?.type === 'refund' ? 'credit' : 'debit';
};

const Transaction: React.FC<TransactionProps> = memo(({ 
  transaction, 
  onClick, 
  isRTL = false 
}) => {
  const { t } = useTranslation();
  const { amount, currency, status, createdAt } = transaction;

  // Handle click events with keyboard support
  const handleClick = (event: React.MouseEvent | React.KeyboardEvent) => {
    if (
      event.type === 'click' || 
      (event.type === 'keydown' && 
        ((event as React.KeyboardEvent).key === 'Enter' || 
         (event as React.KeyboardEvent).key === ' '))
    ) {
      event.preventDefault();
      onClick?.(transaction);
    }
  };

  // Format amount and date based on locale
  const formattedAmount = formatCurrency(amount, currency, isRTL ? 'he' : 'en');
  const formattedDate = formatDate(new Date(createdAt), 'PP', isRTL ? 'he' : 'en');
  const transactionType = getTransactionType(transaction);

  return (
    <TransactionContainer
      onClick={handleClick}
      onKeyDown={handleClick}
      role="button"
      tabIndex={0}
      aria-label={t('transaction.aria.details', {
        amount: formattedAmount,
        date: formattedDate,
        status: t(`transaction.status.${status.toLowerCase()}`)
      })}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <TransactionInfo>
        <TransactionAmount 
          type={transactionType}
          aria-label={t('transaction.aria.amount', { amount: formattedAmount })}
        >
          {transactionType === 'credit' ? '+' : '-'}{formattedAmount}
        </TransactionAmount>
        
        <TransactionStatus
          style={{ color: getStatusColor(status) }}
          aria-label={t('transaction.aria.status', { 
            status: t(`transaction.status.${status.toLowerCase()}`) 
          })}
        >
          {t(`transaction.status.${status.toLowerCase()}`)}
        </TransactionStatus>
      </TransactionInfo>

      <TransactionDate
        aria-label={t('transaction.aria.date', { date: formattedDate })}
      >
        {formattedDate}
      </TransactionDate>
    </TransactionContainer>
  );
});

Transaction.displayName = 'Transaction';

export default Transaction;