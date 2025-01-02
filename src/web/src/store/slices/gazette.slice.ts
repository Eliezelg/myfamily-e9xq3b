/**
 * Gazette Redux Slice
 * Version: 1.0.0
 * 
 * Production-ready Redux slice for managing gazette state in the web frontend.
 * Handles gazette generation, preview, status tracking, print approval workflow,
 * and layout management with comprehensive error handling and performance optimization.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.0
import {
  IGazette,
  GazetteStatus,
  IGazetteLayout,
  LayoutStyle,
  PrintSpecification,
  GazetteError
} from '../../interfaces/gazette.interface';
import { gazetteService } from '../../services/gazette.service';

/**
 * Interface defining the gazette slice state structure
 */
interface GazetteState {
  gazettes: IGazette[];
  currentGazette: IGazette | null;
  previewCache: Record<string, string>;
  printSpecs: PrintSpecification;
  loading: boolean;
  error: GazetteError | null;
  statusUpdates: Record<string, GazetteStatus>;
  performanceMetrics: Record<string, number>;
}

/**
 * Initial state with default values
 */
const initialState: GazetteState = {
  gazettes: [],
  currentGazette: null,
  previewCache: {},
  printSpecs: {
    copies: 1,
    paperStock: '150gsm',
    finishingOptions: ['perfect-binding']
  },
  loading: false,
  error: null,
  statusUpdates: {},
  performanceMetrics: {}
};

/**
 * Create the gazette slice with reducers and actions
 */
const gazetteSlice = createSlice({
  name: 'gazette',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    setError: (state, action: PayloadAction<GazetteError | null>) => {
      state.error = action.payload;
    },
    
    setGazettes: (state, action: PayloadAction<IGazette[]>) => {
      state.gazettes = action.payload;
    },
    
    setCurrentGazette: (state, action: PayloadAction<IGazette | null>) => {
      state.currentGazette = action.payload;
    },
    
    updateGazetteStatus: (state, action: PayloadAction<{ id: string; status: GazetteStatus }>) => {
      const { id, status } = action.payload;
      state.statusUpdates[id] = status;
      
      // Update status in gazettes array if present
      const gazette = state.gazettes.find(g => g.id === id);
      if (gazette) {
        gazette.status = status;
      }
      
      // Update current gazette if matching
      if (state.currentGazette?.id === id) {
        state.currentGazette.status = status;
      }
    },
    
    setPrintSpecs: (state, action: PayloadAction<PrintSpecification>) => {
      state.printSpecs = action.payload;
    },
    
    cachePreview: (state, action: PayloadAction<{ id: string; url: string }>) => {
      const { id, url } = action.payload;
      state.previewCache[id] = url;
    },
    
    updatePerformanceMetrics: (state, action: PayloadAction<Record<string, number>>) => {
      state.performanceMetrics = {
        ...state.performanceMetrics,
        ...action.payload
      };
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    resetState: () => initialState
  }
});

/**
 * Export actions for component usage
 */
export const {
  setLoading,
  setError,
  setGazettes,
  setCurrentGazette,
  updateGazetteStatus,
  setPrintSpecs,
  cachePreview,
  updatePerformanceMetrics,
  clearError,
  resetState
} = gazetteSlice.actions;

/**
 * Thunk for generating a new gazette
 */
export const generateGazette = (familyId: string, layout: IGazetteLayout) => async (dispatch: any) => {
  const startTime = performance.now();
  dispatch(setLoading(true));
  dispatch(clearError());
  
  try {
    const gazette = await gazetteService.generateGazette(familyId, layout);
    dispatch(setCurrentGazette(gazette));
    dispatch(updateGazetteStatus({ id: gazette.id, status: gazette.status }));
    
    // Update performance metrics
    const endTime = performance.now();
    dispatch(updatePerformanceMetrics({
      [`generate_${gazette.id}`]: endTime - startTime
    }));
    
    return gazette;
  } catch (error: any) {
    dispatch(setError({
      code: 'GENERATION_FAILED',
      message: error.message
    }));
    throw error;
  } finally {
    dispatch(setLoading(false));
  }
};

/**
 * Thunk for fetching gazette preview
 */
export const fetchGazettePreview = (gazetteId: string) => async (dispatch: any) => {
  const startTime = performance.now();
  
  try {
    const previewUrl = await gazetteService.getGazettePreview(gazetteId);
    dispatch(cachePreview({ id: gazetteId, url: previewUrl }));
    
    // Update performance metrics
    const endTime = performance.now();
    dispatch(updatePerformanceMetrics({
      [`preview_${gazetteId}`]: endTime - startTime
    }));
    
    return previewUrl;
  } catch (error: any) {
    dispatch(setError({
      code: 'PREVIEW_FAILED',
      message: error.message
    }));
    throw error;
  }
};

/**
 * Thunk for approving gazette for print
 */
export const approveForPrint = (gazetteId: string) => async (dispatch: any, getState: any) => {
  const startTime = performance.now();
  dispatch(setLoading(true));
  dispatch(clearError());
  
  try {
    const { printSpecs } = getState().gazette;
    const gazette = await gazetteService.approveForPrint(gazetteId, {
      approvedBy: 'user', // TODO: Get from auth state
      qualityChecked: true,
      printSpecs
    });
    
    dispatch(updateGazetteStatus({ id: gazette.id, status: gazette.status }));
    
    // Update performance metrics
    const endTime = performance.now();
    dispatch(updatePerformanceMetrics({
      [`approve_${gazetteId}`]: endTime - startTime
    }));
    
    return gazette;
  } catch (error: any) {
    dispatch(setError({
      code: 'APPROVAL_FAILED',
      message: error.message
    }));
    throw error;
  } finally {
    dispatch(setLoading(false));
  }
};

/**
 * Memoized selectors for accessing gazette state
 */
export const gazetteSelectors = {
  selectGazettes: (state: { gazette: GazetteState }) => state.gazette.gazettes,
  selectCurrentGazette: (state: { gazette: GazetteState }) => state.gazette.currentGazette,
  selectGazetteStatus: (state: { gazette: GazetteState }, id: string) => 
    state.gazette.statusUpdates[id] || 
    state.gazette.gazettes.find(g => g.id === id)?.status,
  selectPrintSpecs: (state: { gazette: GazetteState }) => state.gazette.printSpecs,
  selectPreviewUrl: (state: { gazette: GazetteState }, id: string) => 
    state.gazette.previewCache[id],
  selectLoading: (state: { gazette: GazetteState }) => state.gazette.loading,
  selectError: (state: { gazette: GazetteState }) => state.gazette.error,
  selectPerformanceMetrics: (state: { gazette: GazetteState }) => 
    state.gazette.performanceMetrics
};

export default gazetteSlice.reducer;