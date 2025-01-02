/**
 * Family Redux Slice
 * Version: 1.0.0
 * 
 * Comprehensive state management for family-related data including
 * real-time updates, metrics tracking, and enhanced status management
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.0
import { UUID } from 'crypto';

import { 
  IFamily,
  FamilyStatus,
  IFamilySettings,
  IFamilyMember
} from '../../interfaces/family.interface';
import { FamilyService } from '../../services/family.service';
import { IFamilyPool } from '../../interfaces/payment.interface';

/**
 * Interface for family metrics tracking
 */
interface IFamilyMetrics {
  monthlyActiveMembers: number;
  photoCount: number;
  poolUtilization: number;
  lastGazetteDate: Date | null;
}

/**
 * Interface for status history tracking
 */
interface IStatusHistory {
  status: FamilyStatus;
  timestamp: Date;
  reason: string;
}

/**
 * Interface for family slice state
 */
interface FamilyState {
  families: IFamily[];
  currentFamilyId: UUID | null;
  loading: Record<string, boolean>;
  error: Record<string, string | null>;
  lastUpdated: Date | null;
  metrics: Record<UUID, IFamilyMetrics>;
  statusHistory: Record<UUID, IStatusHistory[]>;
  poolUtilization: Record<UUID, number>;
}

/**
 * Initial state for family slice
 */
const initialState: FamilyState = {
  families: [],
  currentFamilyId: null,
  loading: {},
  error: {},
  lastUpdated: null,
  metrics: {},
  statusHistory: {},
  poolUtilization: {}
};

/**
 * Async thunk for fetching family list with enhanced error handling
 */
export const fetchFamilies = createAsyncThunk(
  'family/fetchFamilies',
  async (_, { rejectWithValue }) => {
    try {
      const familyService = new FamilyService();
      const families = await familyService.getFamilyList();
      return families;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Async thunk for updating family status with history tracking
 */
export const updateFamilyStatus = createAsyncThunk(
  'family/updateStatus',
  async ({ 
    familyId, 
    status, 
    reason 
  }: { 
    familyId: UUID; 
    status: FamilyStatus; 
    reason: string 
  }, { rejectWithValue }) => {
    try {
      const familyService = new FamilyService();
      const updatedFamily = await familyService.updateFamilyStatus(familyId, status);
      return { family: updatedFamily, status, reason };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Async thunk for fetching family metrics
 */
export const fetchFamilyMetrics = createAsyncThunk(
  'family/fetchMetrics',
  async (familyId: UUID, { rejectWithValue }) => {
    try {
      const familyService = new FamilyService();
      const metrics = await familyService.getFamilyMetrics(familyId);
      return { familyId, metrics };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Family slice definition with comprehensive state management
 */
const familySlice = createSlice({
  name: 'family',
  initialState,
  reducers: {
    setCurrentFamily: (state, action: PayloadAction<UUID>) => {
      state.currentFamilyId = action.payload;
    },
    updateFamilyMetrics: (state, action: PayloadAction<{ 
      familyId: UUID; 
      metrics: Partial<IFamilyMetrics> 
    }>) => {
      const { familyId, metrics } = action.payload;
      state.metrics[familyId] = {
        ...state.metrics[familyId],
        ...metrics
      };
    },
    updatePoolUtilization: (state, action: PayloadAction<{
      familyId: UUID;
      utilization: number;
    }>) => {
      state.poolUtilization[action.payload.familyId] = action.payload.utilization;
    }
  },
  extraReducers: (builder) => {
    // Fetch Families
    builder.addCase(fetchFamilies.pending, (state) => {
      state.loading['fetchFamilies'] = true;
      state.error['fetchFamilies'] = null;
    });
    builder.addCase(fetchFamilies.fulfilled, (state, action) => {
      state.families = action.payload;
      state.loading['fetchFamilies'] = false;
      state.lastUpdated = new Date();
    });
    builder.addCase(fetchFamilies.rejected, (state, action) => {
      state.loading['fetchFamilies'] = false;
      state.error['fetchFamilies'] = action.payload as string;
    });

    // Update Family Status
    builder.addCase(updateFamilyStatus.pending, (state) => {
      state.loading['updateStatus'] = true;
      state.error['updateStatus'] = null;
    });
    builder.addCase(updateFamilyStatus.fulfilled, (state, action) => {
      const { family, status, reason } = action.payload;
      const familyIndex = state.families.findIndex(f => f.id === family.id);
      if (familyIndex !== -1) {
        state.families[familyIndex] = family;
        // Update status history
        const history = state.statusHistory[family.id] || [];
        state.statusHistory[family.id] = [
          ...history,
          {
            status,
            timestamp: new Date(),
            reason
          }
        ];
      }
      state.loading['updateStatus'] = false;
    });
    builder.addCase(updateFamilyStatus.rejected, (state, action) => {
      state.loading['updateStatus'] = false;
      state.error['updateStatus'] = action.payload as string;
    });

    // Fetch Family Metrics
    builder.addCase(fetchFamilyMetrics.pending, (state) => {
      state.loading['fetchMetrics'] = true;
      state.error['fetchMetrics'] = null;
    });
    builder.addCase(fetchFamilyMetrics.fulfilled, (state, action) => {
      const { familyId, metrics } = action.payload;
      state.metrics[familyId] = metrics;
      state.loading['fetchMetrics'] = false;
    });
    builder.addCase(fetchFamilyMetrics.rejected, (state, action) => {
      state.loading['fetchMetrics'] = false;
      state.error['fetchMetrics'] = action.payload as string;
    });
  }
});

// Export actions
export const { 
  setCurrentFamily, 
  updateFamilyMetrics, 
  updatePoolUtilization 
} = familySlice.actions;

// Export selectors
export const selectAllFamilies = (state: { family: FamilyState }) => state.family.families;
export const selectCurrentFamily = (state: { family: FamilyState }) => {
  const { families, currentFamilyId } = state.family;
  return families.find(family => family.id === currentFamilyId) || null;
};
export const selectFamilyMetrics = (familyId: UUID) => 
  (state: { family: FamilyState }) => state.family.metrics[familyId];
export const selectFamilyStatusHistory = (familyId: UUID) => 
  (state: { family: FamilyState }) => state.family.statusHistory[familyId] || [];
export const selectFamilyLoading = (key: string) => 
  (state: { family: FamilyState }) => state.family.loading[key];
export const selectFamilyError = (key: string) => 
  (state: { family: FamilyState }) => state.family.error[key];
export const selectPoolUtilization = (familyId: UUID) => 
  (state: { family: FamilyState }) => state.family.poolUtilization[familyId];

// Export reducer
export default familySlice.reducer;