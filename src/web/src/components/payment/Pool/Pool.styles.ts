import styled from 'styled-components'; // v5.3.0
import { COLORS, TYPOGRAPHY, SPACING, BREAKPOINTS } from '../../styles/theme.styles';

export const PoolContainer = styled.div`
  padding: ${SPACING.padding.medium};
  background-color: ${COLORS.background.primary};
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin: ${SPACING.margins.medium} 0;
  transition: box-shadow 0.3s ease;

  &:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  @media (max-width: ${BREAKPOINTS.mobile.max}) {
    padding: ${SPACING.padding.small};
    margin: ${SPACING.margins.small} 0;
  }
`;

export const BalanceSection = styled.section`
  margin-bottom: ${SPACING.margins.large};
  padding: ${SPACING.padding.medium};
  background-color: ${COLORS.background.secondary};
  border-radius: 4px;
  font-family: ${TYPOGRAPHY.fontFamily.primary};
  font-size: ${TYPOGRAPHY.fontSize.h2};
  font-weight: ${TYPOGRAPHY.fontWeight.bold};
  color: ${COLORS.text.primary};
  transition: background-color 0.3s ease;

  [dir='rtl'] & {
    font-family: ${TYPOGRAPHY.fontFamily.rtl};
    text-align: right;
  }

  .balance-amount {
    color: ${COLORS.primary.main};
    font-size: ${TYPOGRAPHY.fontSize.h1};
    margin: ${SPACING.margins.small} 0;
  }

  .next-charge {
    font-size: ${TYPOGRAPHY.fontSize.body};
    color: ${COLORS.text.secondary};
  }
`;

export const PaymentMethodsSection = styled.section`
  margin-bottom: ${SPACING.margins.medium};
  padding: ${SPACING.padding.medium};
  border-bottom: 1px solid ${COLORS.background.secondary};
  font-size: ${TYPOGRAPHY.fontSize.body};
  line-height: ${TYPOGRAPHY.lineHeight.body};
  transition: border-color 0.3s ease;

  .payment-method {
    display: flex;
    align-items: center;
    padding: ${SPACING.padding.small} 0;
    
    &:hover {
      background-color: ${COLORS.background.secondary};
    }
  }

  .add-method-button {
    margin-top: ${SPACING.margins.medium};
    color: ${COLORS.primary.main};
    font-weight: ${TYPOGRAPHY.fontWeight.medium};
  }
`;

export const TransactionsSection = styled.section`
  padding: ${SPACING.padding.medium};
  font-size: ${TYPOGRAPHY.fontSize.body};
  line-height: ${TYPOGRAPHY.lineHeight.body};

  .transaction-list {
    border-spacing: 0;
    width: 100%;
  }

  .transaction-item {
    border-bottom: 1px solid ${COLORS.background.secondary};
    transition: background-color 0.3s ease;

    &:hover {
      background-color: ${COLORS.background.secondary};
    }

    td {
      padding: ${SPACING.padding.small};
    }

    .amount {
      font-weight: ${TYPOGRAPHY.fontWeight.medium};
      
      &.positive {
        color: ${COLORS.success.main};
      }
      
      &.negative {
        color: ${COLORS.error.main};
      }
    }

    .date {
      color: ${COLORS.text.secondary};
      font-size: ${TYPOGRAPHY.fontSize.small};
    }
  }

  @media (max-width: ${BREAKPOINTS.mobile.max}) {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    scrollbar-color: ${COLORS.background.secondary} transparent;

    &::-webkit-scrollbar {
      height: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background-color: ${COLORS.background.secondary};
      border-radius: 3px;
    }

    .transaction-list {
      min-width: 500px;
    }
  }
`;