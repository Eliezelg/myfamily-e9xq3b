import styled from 'styled-components'; // v5.3.0
import { COLORS, SPACING, BREAKPOINTS } from '../../styles/theme.styles';

// Print production specifications
const A4_DIMENSIONS = {
  width: '210mm',
  height: '297mm',
  bleed: '3mm',
  safeArea: '5mm',
  printResolution: '300dpi',
  colorProfile: 'Fogra39'
} as const;

// Animation and transition specifications
const PREVIEW_TRANSITION = {
  duration: '300ms',
  timing: 'ease-in-out',
  zoomSteps: [0.5, 0.75, 1, 1.25, 1.5],
  willChange: 'transform'
} as const;

// Touch interaction specifications
const TOUCH_TARGETS = {
  minSize: '44px',
  spacing: '8px',
  hitArea: '24px'
} as const;

export const PreviewContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${SPACING.padding.large};
  background-color: ${COLORS.background.secondary};
  position: relative;
  overflow-x: hidden;
  touch-action: manipulation;
  user-select: none;
  -webkit-tap-highlight-color: transparent;

  @media screen and (min-width: ${BREAKPOINTS.mobile.min}) {
    padding: ${SPACING.padding.medium};
    transform: scale(0.5);
  }

  @media screen and (min-width: ${BREAKPOINTS.tablet.min}) {
    padding: ${SPACING.padding.large};
    transform: scale(0.75);
  }

  @media screen and (min-width: ${BREAKPOINTS.desktop.min}) {
    padding: ${SPACING.padding.xlarge};
    transform: scale(1);
  }
`;

export const PreviewContent = styled.div<{ zoom?: number }>`
  width: ${A4_DIMENSIONS.width};
  height: ${A4_DIMENSIONS.height};
  margin: ${A4_DIMENSIONS.bleed};
  background-color: ${COLORS.background.primary};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: transform ${PREVIEW_TRANSITION.duration} ${PREVIEW_TRANSITION.timing};
  transform-origin: center center;
  will-change: ${PREVIEW_TRANSITION.willChange};
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
  transform: scale(${props => props.zoom || 1});

  @media print {
    margin: 0;
    box-shadow: none;
    color-adjust: exact;
  }
`;

export const NavigationControls = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: ${A4_DIMENSIONS.width};
  margin-top: ${SPACING.margins.medium};
  
  button {
    min-width: ${TOUCH_TARGETS.minSize};
    min-height: ${TOUCH_TARGETS.minSize};
    padding: ${TOUCH_TARGETS.spacing};
    touch-action: manipulation;
  }
`;

export const ZoomControls = styled.div`
  position: absolute;
  right: ${SPACING.margins.medium};
  bottom: ${SPACING.margins.medium};
  display: flex;
  flex-direction: column;
  gap: ${TOUCH_TARGETS.spacing};
  
  button {
    min-width: ${TOUCH_TARGETS.minSize};
    min-height: ${TOUCH_TARGETS.minSize};
    border-radius: 50%;
    background-color: ${COLORS.background.paper};
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: manipulation;
  }

  @media screen and (max-width: ${BREAKPOINTS.mobile.max}) {
    right: ${SPACING.margins.small};
    bottom: ${SPACING.margins.small};
  }
`;

export const PageIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: ${TOUCH_TARGETS.minSize};
  padding: ${SPACING.padding.small} ${SPACING.padding.medium};
  background-color: ${COLORS.background.paper};
  border-radius: ${TOUCH_TARGETS.spacing};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-size: 14px;
  color: ${COLORS.text.secondary};

  @media screen and (max-width: ${BREAKPOINTS.mobile.max}) {
    padding: ${SPACING.padding.small};
  }
`;

export const SafeAreaGuide = styled.div`
  position: absolute;
  top: ${A4_DIMENSIONS.safeArea};
  right: ${A4_DIMENSIONS.safeArea};
  bottom: ${A4_DIMENSIONS.safeArea};
  left: ${A4_DIMENSIONS.safeArea};
  border: 1px dashed rgba(0, 0, 0, 0.1);
  pointer-events: none;

  @media print {
    display: none;
  }
`;

export const BleedAreaGuide = styled.div`
  position: absolute;
  top: -${A4_DIMENSIONS.bleed};
  right: -${A4_DIMENSIONS.bleed};
  bottom: -${A4_DIMENSIONS.bleed};
  left: -${A4_DIMENSIONS.bleed};
  border: 1px dashed rgba(255, 0, 0, 0.1);
  pointer-events: none;

  @media print {
    display: none;
  }
`;