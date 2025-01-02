import { createGlobalStyle } from 'styled-components'; // v5.3.0
import { normalize } from 'styled-normalize'; // v8.0.7
import { COLORS, TYPOGRAPHY, SPACING, BREAKPOINTS } from './theme.styles';
import { bodyText, rtlText, fontSmoothing } from './typography.styles';

const GlobalStyles = createGlobalStyle`
  /* CSS Reset & Normalization */
  ${normalize}

  /* Box Sizing Reset */
  html {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    min-height: 100vh;
    scroll-behavior: smooth;
    text-size-adjust: 100%;
    font-size: ${TYPOGRAPHY.fontSize.body};
    line-height: ${TYPOGRAPHY.lineHeight.body};
  }

  *, *::before, *::after {
    box-sizing: inherit;
    margin: 0;
    padding: 0;
  }

  /* Base Body Styles */
  body {
    font-family: ${TYPOGRAPHY.fontFamily.primary}, ${TYPOGRAPHY.fontFamily.fallback};
    color: ${COLORS.text.primary};
    background-color: ${COLORS.background.primary};
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    content-visibility: auto;
    contain: content;
  }

  /* RTL Support */
  html[dir='rtl'] body {
    font-family: ${TYPOGRAPHY.fontFamily.rtl}, ${TYPOGRAPHY.fontFamily.fallback};
    direction: rtl;
    writing-mode: horizontal-tb;
  }

  /* Typography Base Styles */
  h1 {
    font-size: ${TYPOGRAPHY.fontSize.h1};
    line-height: ${TYPOGRAPHY.lineHeight.heading};
    font-weight: ${TYPOGRAPHY.fontWeight.bold};
    margin-block: ${SPACING.margins.medium};
  }

  h2 {
    font-size: ${TYPOGRAPHY.fontSize.h2};
    line-height: ${TYPOGRAPHY.lineHeight.heading};
    font-weight: ${TYPOGRAPHY.fontWeight.bold};
    margin-block: ${SPACING.margins.small};
  }

  h3 {
    font-size: ${TYPOGRAPHY.fontSize.h3};
    line-height: ${TYPOGRAPHY.lineHeight.heading};
    font-weight: ${TYPOGRAPHY.fontWeight.bold};
    margin-block: ${SPACING.margins.small};
  }

  p {
    margin-block: ${SPACING.margins.small};
  }

  /* Responsive Media */
  img, video, canvas, svg {
    display: block;
    max-width: 100%;
    height: auto;
  }

  /* Focus States */
  :focus-visible {
    outline: 2px solid ${COLORS.primary.main};
    outline-offset: 2px;
  }

  /* Touch Target Sizing */
  button, a, input, select, textarea, [role="button"] {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  /* Interactive Elements Base Styles */
  a {
    color: ${COLORS.primary.main};
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  button {
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
    padding: ${SPACING.padding.small} ${SPACING.padding.medium};
  }

  /* Responsive Breakpoints */
  @media screen and (min-width: ${BREAKPOINTS.mobile.min}) {
    html {
      font-size: calc(${TYPOGRAPHY.fontSize.body} + 0.1vw);
    }
  }

  @media screen and (min-width: ${BREAKPOINTS.tablet.min}) {
    html {
      font-size: calc(${TYPOGRAPHY.fontSize.body} + 0.2vw);
    }
  }

  @media screen and (min-width: ${BREAKPOINTS.desktop.min}) {
    html {
      font-size: calc(${TYPOGRAPHY.fontSize.body} + 0.3vw);
    }
  }

  /* Dark Mode Support */
  @media (prefers-color-scheme: dark) {
    body {
      background-color: ${COLORS.background.default};
      color: rgba(255, 255, 255, 0.87);
    }
  }

  /* Reduced Motion Support */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  /* High Contrast Mode Support */
  @media (forced-colors: active) {
    * {
      forced-color-adjust: none;
    }
  }

  /* Print Styles */
  @media print {
    body {
      background-color: white;
      color: black;
    }

    @page {
      margin: ${SPACING.margins.medium};
    }
  }
`;

export default GlobalStyles;