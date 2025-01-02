import styled from 'styled-components'; // v5.3.0
import { COLORS, SPACING, TYPOGRAPHY } from '../../../styles/theme.styles';

// Constants for styling
const HOVER_TRANSITION = 'background-color 0.2s ease-in-out';
const HOVER_BACKGROUND_OPACITY = '0.05';

// Container for the entire transaction item
export const TransactionContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${SPACING.padding.medium};
  margin-bottom: ${SPACING.margins.small};
  border-radius: 8px;
  background-color: ${COLORS.background.secondary};
  transition: ${HOVER_TRANSITION};
  cursor: pointer;
  font-family: ${TYPOGRAPHY.fontFamily.primary};

  &:hover {
    background-color: ${props => `${COLORS.primary.main}${HOVER_BACKGROUND_OPACITY}`};
  }

  /* RTL Support */
  [dir='rtl'] & {
    flex-direction: row-reverse;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    padding: ${SPACING.padding.small};
  }
`;

// Container for transaction details
export const TransactionInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${SPACING.padding.small};
  flex: 1;
  min-width: 0;

  /* RTL Support */
  [dir='rtl'] & {
    flex-direction: row-reverse;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    gap: ${SPACING.padding.small};
  }
`;

// Styled component for transaction amount
export const TransactionAmount = styled.span<{ type: 'credit' | 'debit' }>`
  font-size: ${TYPOGRAPHY.fontSize.body};
  font-weight: ${TYPOGRAPHY.fontWeight.bold};
  color: ${props => props.type === 'credit' ? COLORS.success.main : COLORS.error.main};
  white-space: nowrap;

  /* Responsive design */
  @media (max-width: 768px) {
    font-size: ${TYPOGRAPHY.fontSize.small};
  }
`;

// Styled component for transaction date
export const TransactionDate = styled.span`
  font-size: ${TYPOGRAPHY.fontSize.body};
  color: ${COLORS.text.secondary};
  margin-left: auto;
  white-space: nowrap;

  /* RTL Support */
  [dir='rtl'] & {
    margin-left: 0;
    margin-right: auto;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    font-size: ${TYPOGRAPHY.fontSize.small};
  }
`;