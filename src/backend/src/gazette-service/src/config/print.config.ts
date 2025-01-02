/**
 * Print Service Configuration
 * Implements professional printing requirements and specifications
 * @see Technical Specifications/8.1.1 Print Production Specifications
 * @version 1.0.0
 */

import { config } from 'dotenv'; // v16.0.3
import { PrintConfig } from '../../../shared/interfaces/config.interface';
import { 
  PageSize, 
  ColorSpace, 
  BindingType,
  DEFAULT_RESOLUTION,
  DEFAULT_BLEED
} from '../../../shared/interfaces/gazette.interface';

// Initialize environment variables
config();

// Print quality constants
const DEFAULT_COVER_GSM = 250;  // Cover paper weight in GSM
const DEFAULT_INTERIOR_GSM = 150;  // Interior paper weight in GSM

/**
 * Validates print configuration against professional requirements
 * @param config PrintConfig object to validate
 * @returns boolean indicating if configuration meets all requirements
 */
export const validatePrintConfig = (config: PrintConfig): boolean => {
  if (!config.apiUrl || !config.apiUrl.startsWith('https://')) {
    return false;
  }

  if (!config.apiKey || config.apiKey.length < 32) {
    return false;
  }

  if (config.resolution < DEFAULT_RESOLUTION) {
    return false;
  }

  if (config.colorSpace !== ColorSpace.CMYK) {
    return false;
  }

  if (config.bleed < DEFAULT_BLEED) {
    return false;
  }

  if (!config.paperStock || 
      parseInt(config.paperStock.cover) < DEFAULT_COVER_GSM || 
      parseInt(config.paperStock.interior) < DEFAULT_INTERIOR_GSM) {
    return false;
  }

  if (config.binding !== BindingType.PERFECT) {
    return false;
  }

  return true;
};

/**
 * Print service configuration implementing ISO 216 standard
 * and professional printing requirements
 */
export const printConfig: PrintConfig = {
  // Print service API configuration
  apiUrl: process.env.PRINT_SERVICE_API_URL || '',
  apiKey: process.env.PRINT_SERVICE_API_KEY || '',

  // ISO 216 standard format
  defaultFormat: PageSize.A4, // 210×297mm

  // Print quality specifications
  resolution: DEFAULT_RESOLUTION, // 300 DPI minimum
  colorSpace: ColorSpace.CMYK, // Fogra39 color profile
  colorProfile: 'Fogra39',

  // Professional print specifications
  bleed: DEFAULT_BLEED, // 3mm bleed
  binding: BindingType.PERFECT, // Perfect binding for durability

  // Paper stock specifications
  paperStock: {
    cover: `${DEFAULT_COVER_GSM}`, // 250gsm cover
    interior: `${DEFAULT_INTERIOR_GSM}`, // 150gsm interior
  }
};

// Validate configuration on initialization
if (!validatePrintConfig(printConfig)) {
  throw new Error('Invalid print configuration. Please check environment variables and specifications.');
}

export default printConfig;