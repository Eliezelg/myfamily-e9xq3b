/**
 * @fileoverview Enhanced Redux Toolkit slice for content management with print validation
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // version: ^1.9.0
import { IContent } from '../../interfaces/content.interface';
import { ContentService } from '../../services/content.service';

/**
 * Enhanced content state interface with print validation and translation tracking
 */
interface ContentState {
  items: IContent[];
  loadingStates: {
    upload: boolean;
    validation: boolean;
    translation: boolean;
    deletion: boolean;
  };
  errors: {
    upload: string | null;
    validation: string | null;
    translation: string | null;
    deletion: string | null;
  };
  selectedContent: IContent | null;
  printQualityStats: {
    total: number;
    ready: number;
    pending: number;
    failed: number;
  };
  translationProgress: {
    [key: string]: {
      completed: number;
      total: number;
    };
  };
}

/**
 * Initial state with enhanced tracking capabilities
 */
const initialState: ContentState = {
  items: [],
  loadingStates: {
    upload: false,
    validation: false,
    translation: false,
    deletion: false
  },
  errors: {
    upload: null,
    validation: null,
    translation: null,
    deletion: null
  },
  selectedContent: null,
  printQualityStats: {
    total: 0,
    ready: 0,
    pending: 0,
    failed: 0
  },
  translationProgress: {},
};

// Initialize ContentService
const contentService = new ContentService({
  baseURL: process.env.REACT_APP_API_URL || '',
  maxRetries: 3,
  chunkSize: 1024 * 1024,
  timeout: 30000
});

/**
 * Enhanced async thunk for content upload with print validation
 */
export const uploadContentWithValidation = createAsyncThunk(
  'content/uploadWithValidation',
  async (payload: {
    file: File | string;
    type: ContentType;
    metadata: IContentMetadata;
    validatePrint: boolean;
  }, { rejectWithValue }) => {
    try {
      const content = await contentService.uploadContent(
        payload.file,
        payload.type,
        payload.metadata
      );

      if (payload.validatePrint) {
        const isPrintReady = await contentService.validateContent(content.id);
        return { ...content, printReady: isPrintReady };
      }

      return content;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk for validating print quality of existing content
 */
export const validatePrintQuality = createAsyncThunk(
  'content/validatePrintQuality',
  async (contentId: string, { rejectWithValue }) => {
    try {
      return await contentService.validateContent(contentId);
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk for content translation
 */
export const translateContent = createAsyncThunk(
  'content/translate',
  async (payload: {
    contentId: string;
    targetLanguages: string[];
    options?: {
      priority?: 'HIGH' | 'NORMAL';
      notifyOnCompletion?: boolean;
    };
  }, { rejectWithValue }) => {
    try {
      return await contentService.translateContent(
        payload.contentId,
        payload.targetLanguages,
        payload.options
      );
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Enhanced content slice with print validation and translation features
 */
const contentSlice = createSlice({
  name: 'content',
  initialState,
  reducers: {
    setLoadingState: (
      state,
      action: PayloadAction<{ type: keyof ContentState['loadingStates']; isLoading: boolean }>
    ) => {
      state.loadingStates[action.payload.type] = action.payload.isLoading;
    },
    setError: (
      state,
      action: PayloadAction<{ type: keyof ContentState['errors']; error: string | null }>
    ) => {
      state.errors[action.payload.type] = action.payload.error;
    },
    setItems: (state, action: PayloadAction<IContent[]>) => {
      state.items = action.payload;
      state.printQualityStats = calculatePrintStats(action.payload);
    },
    addItem: (state, action: PayloadAction<IContent>) => {
      state.items.push(action.payload);
      state.printQualityStats = calculatePrintStats(state.items);
    },
    updateItem: (state, action: PayloadAction<IContent>) => {
      const index = state.items.findIndex(item => item.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
        state.printQualityStats = calculatePrintStats(state.items);
      }
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item.id !== action.payload);
      state.printQualityStats = calculatePrintStats(state.items);
    },
    setSelectedContent: (state, action: PayloadAction<IContent | null>) => {
      state.selectedContent = action.payload;
    },
    updateTranslationProgress: (
      state,
      action: PayloadAction<{ language: string; completed: number; total: number }>
    ) => {
      state.translationProgress[action.payload.language] = {
        completed: action.payload.completed,
        total: action.payload.total
      };
    },
    clearState: (state) => {
      Object.assign(state, initialState);
    }
  },
  extraReducers: (builder) => {
    builder
      // Upload with validation
      .addCase(uploadContentWithValidation.pending, (state) => {
        state.loadingStates.upload = true;
        state.errors.upload = null;
      })
      .addCase(uploadContentWithValidation.fulfilled, (state, action) => {
        state.loadingStates.upload = false;
        state.items.push(action.payload);
        state.printQualityStats = calculatePrintStats(state.items);
      })
      .addCase(uploadContentWithValidation.rejected, (state, action) => {
        state.loadingStates.upload = false;
        state.errors.upload = action.payload as string;
      })
      // Print quality validation
      .addCase(validatePrintQuality.pending, (state) => {
        state.loadingStates.validation = true;
        state.errors.validation = null;
      })
      .addCase(validatePrintQuality.fulfilled, (state, action) => {
        state.loadingStates.validation = false;
        if (state.selectedContent) {
          state.selectedContent.printReady = action.payload;
          const index = state.items.findIndex(item => item.id === state.selectedContent?.id);
          if (index !== -1) {
            state.items[index].printReady = action.payload;
          }
          state.printQualityStats = calculatePrintStats(state.items);
        }
      })
      .addCase(validatePrintQuality.rejected, (state, action) => {
        state.loadingStates.validation = false;
        state.errors.validation = action.payload as string;
      })
      // Translation
      .addCase(translateContent.pending, (state) => {
        state.loadingStates.translation = true;
        state.errors.translation = null;
      })
      .addCase(translateContent.fulfilled, (state, action) => {
        state.loadingStates.translation = false;
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(translateContent.rejected, (state, action) => {
        state.loadingStates.translation = false;
        state.errors.translation = action.payload as string;
      });
  }
});

/**
 * Helper function to calculate print quality statistics
 */
const calculatePrintStats = (items: IContent[]) => {
  return items.reduce(
    (stats, item) => ({
      total: stats.total + 1,
      ready: stats.ready + (item.printReady ? 1 : 0),
      pending: stats.pending + (item.status === 'PROCESSING' ? 1 : 0),
      failed: stats.failed + (!item.printReady && item.status === 'ERROR' ? 1 : 0)
    }),
    { total: 0, ready: 0, pending: 0, failed: 0 }
  );
};

export const { 
  setLoadingState,
  setError,
  setItems,
  addItem,
  updateItem,
  removeItem,
  setSelectedContent,
  updateTranslationProgress,
  clearState
} = contentSlice.actions;

export default contentSlice.reducer;