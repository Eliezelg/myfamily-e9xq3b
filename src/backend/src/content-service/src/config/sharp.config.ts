import sharp, { 
  JpegOptions, 
  PngOptions, 
  Sharp, 
  FormatEnum, 
  Color 
} from 'sharp'; // ^0.31.0

/**
 * Interface for print-specific processing options including resolution,
 * color space, and dimensional requirements
 */
interface PrintOptions {
  resolution: number;
  colorspace: string;
  profile: string;
  quality: number;
  density: number;
  pageSize: {
    width: number;
    height: number;
    units: string;
  };
  bleed: {
    top: number;
    right: number;
    bottom: number;
    left: number;
    units: string;
  };
}

// Global configuration constants
const DEFAULT_QUALITY = 85;
const PRINT_DPI = 300;
const MAX_DIMENSION = 4096;
const MIN_PRINT_QUALITY = 100;
const ICC_PROFILE_PATH = '/usr/share/color/icc/';

/**
 * Enhanced JPEG configuration for optimal web delivery
 * Implements mozjpeg optimizations with high quality preservation
 */
const JPEG_CONFIG: JpegOptions = {
  quality: DEFAULT_QUALITY,
  chromaSubsampling: '4:4:4', // Disable chroma subsampling for better quality
  mozjpeg: true, // Enable mozjpeg optimizations
  optimizeCoding: true, // Enable optimal Huffman coding
  trellisQuantisation: true, // Enable trellis quantisation for compression
};

/**
 * Enhanced PNG configuration for optimal web delivery
 * Implements maximum compression with quality preservation
 */
const PNG_CONFIG: PngOptions = {
  compressionLevel: 9, // Maximum compression
  palette: true, // Enable palette optimization
  quality: 90, // High quality setting
  adaptiveFiltering: true, // Enable adaptive filtering
  progressive: true, // Enable progressive rendering
};

/**
 * Professional print-ready configuration conforming to industry standards
 * Implements CMYK color space with Fogra39 profile and proper resolution
 */
const PRINT_PRESET: PrintOptions = {
  resolution: PRINT_DPI,
  colorspace: 'cmyk',
  profile: 'Fogra39',
  quality: MIN_PRINT_QUALITY,
  density: PRINT_DPI,
  pageSize: {
    width: 210, // A4 width in mm
    height: 297, // A4 height in mm
    units: 'mm'
  },
  bleed: {
    top: 3,
    right: 3,
    bottom: 3,
    left: 3,
    units: 'mm'
  }
};

/**
 * Factory function that returns environment-specific Sharp.js configuration
 * @param outputType - Desired output type ('web' | 'print')
 * @param options - Optional override configuration
 * @returns Sharp configuration object
 */
const getSharpConfig = (
  outputType: 'web' | 'print',
  options?: Partial<PrintOptions>
): Sharp => {
  // Initialize base Sharp instance
  const pipeline = sharp();

  if (outputType === 'print') {
    const printConfig = {
      ...PRINT_PRESET,
      ...options
    };

    // Configure for print output
    pipeline
      .resize({
        width: Math.min(printConfig.pageSize.width * printConfig.resolution / 25.4, MAX_DIMENSION),
        height: Math.min(printConfig.pageSize.height * printConfig.resolution / 25.4, MAX_DIMENSION),
        fit: 'inside',
      })
      .withMetadata({
        density: printConfig.density
      })
      .toColorspace(printConfig.colorspace as keyof FormatEnum)
      .icc(`${ICC_PROFILE_PATH}${printConfig.profile}.icc`);
  } else {
    // Configure for web output
    pipeline
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true
      })
      .toColorspace('srgb');
  }

  return pipeline;
};

/**
 * Exported configuration object containing all Sharp.js presets
 * and configuration utilities
 */
export const sharpConfig = {
  jpeg: JPEG_CONFIG,
  png: PNG_CONFIG,
  printPreset: PRINT_PRESET,
  getConfig: getSharpConfig
};

export type { PrintOptions };