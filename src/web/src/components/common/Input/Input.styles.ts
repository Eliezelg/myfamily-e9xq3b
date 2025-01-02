import styled from 'styled-components'; // v5.3.0
import { COLORS, TYPOGRAPHY, SPACING } from '../../../styles/theme.styles';

// Constants for input styling
const INPUT_TRANSITION = 'all 0.2s ease-in-out';
const INPUT_BORDER_RADIUS = '4px';
const INPUT_BORDER_WIDTH = '1px';
const INPUT_FOCUS_RING_WIDTH = '2px';
const INPUT_ICON_SIZE = '24px';

// Props interfaces
interface InputContainerProps {
  hasError?: boolean;
  isDisabled?: boolean;
  isRTL?: boolean;
}

interface StyledInputProps extends InputContainerProps {
  hasIcon?: boolean;
}

// Container component for input field and label
export const InputContainer = styled.div<InputContainerProps>`
  position: relative;
  width: 100%;
  margin-bottom: ${SPACING.margins.small};
  direction: ${({ isRTL }) => isRTL ? 'rtl' : 'ltr'};
  opacity: ${({ isDisabled }) => isDisabled ? '0.6' : '1'};
  pointer-events: ${({ isDisabled }) => isDisabled ? 'none' : 'auto'};
`;

// Styled input field component
export const StyledInput = styled.input<StyledInputProps>`
  width: 100%;
  height: 40px;
  padding: ${SPACING.padding.small} ${SPACING.padding.medium};
  padding-${({ isRTL }) => isRTL ? 'right' : 'left'}: ${({ hasIcon }) => 
    hasIcon ? `calc(${SPACING.padding.medium} + ${INPUT_ICON_SIZE})` : SPACING.padding.medium};
  
  font-family: ${({ isRTL }) => 
    isRTL ? TYPOGRAPHY.fontFamily.rtl : TYPOGRAPHY.fontFamily.primary};
  font-size: ${TYPOGRAPHY.fontSize.body};
  color: ${COLORS.text.primary};
  
  background-color: ${COLORS.background.paper};
  border: ${INPUT_BORDER_WIDTH} solid ${({ hasError }) => 
    hasError ? COLORS.error.main : COLORS.text.secondary};
  border-radius: ${INPUT_BORDER_RADIUS};
  
  transition: ${INPUT_TRANSITION};
  
  &:hover {
    border-color: ${({ hasError }) => 
      hasError ? COLORS.error.dark : COLORS.primary.main};
  }
  
  &:focus {
    outline: none;
    border-color: ${({ hasError }) => 
      hasError ? COLORS.error.main : COLORS.primary.main};
    box-shadow: 0 0 0 ${INPUT_FOCUS_RING_WIDTH} ${({ hasError }) => 
      hasError ? COLORS.error.light : COLORS.primary.light}40;
  }
  
  &::placeholder {
    color: ${COLORS.text.hint};
  }
  
  &:disabled {
    background-color: ${COLORS.background.secondary};
    border-color: ${COLORS.text.disabled};
    cursor: not-allowed;
  }
`;

// Label component for input
export const InputLabel = styled.label<InputContainerProps>`
  display: block;
  margin-bottom: ${SPACING.padding.small};
  
  font-family: ${({ isRTL }) => 
    isRTL ? TYPOGRAPHY.fontFamily.rtl : TYPOGRAPHY.fontFamily.primary};
  font-size: ${TYPOGRAPHY.fontSize.small};
  font-weight: ${TYPOGRAPHY.fontWeight.medium};
  color: ${({ hasError }) => 
    hasError ? COLORS.error.main : COLORS.text.primary};
  
  text-align: ${({ isRTL }) => isRTL ? 'right' : 'left'};
`;

// Error message component
export const ErrorMessage = styled.span`
  display: block;
  margin-top: ${SPACING.padding.small};
  
  font-family: ${TYPOGRAPHY.fontFamily.primary};
  font-size: ${TYPOGRAPHY.fontSize.small};
  color: ${COLORS.error.main};
  
  animation: fadeIn 0.2s ease-in;
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

// Icon component for input
export const InputIcon = styled.div<InputContainerProps>`
  position: absolute;
  top: 50%;
  ${({ isRTL }) => isRTL ? 'right' : 'left'}: ${SPACING.padding.small};
  transform: translateY(-50%);
  
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${INPUT_ICON_SIZE};
  height: ${INPUT_ICON_SIZE};
  
  color: ${({ hasError }) => 
    hasError ? COLORS.error.main : COLORS.text.secondary};
  
  pointer-events: none;
  transition: ${INPUT_TRANSITION};
`;