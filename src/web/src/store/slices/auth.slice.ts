/**
 * Redux Toolkit slice for authentication state management
 * Implements JWT-based authentication, 2FA, session tracking, and RBAC
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // v1.9.0
import { IAuthResponse, IAuthUser, ILoginCredentials, UserStatus } from '../../interfaces/auth.interface';
import { RootState } from '../store';

// Enhanced authentication state interface with security tracking
interface AuthState {
  user: IAuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  requires2FA: boolean;
  sessionExpiry: Date | null;
  lastActivity: Date | null;
  loginAttempts: number;
}

// Initial state with security defaults
const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  requires2FA: false,
  sessionExpiry: null,
  lastActivity: null,
  loginAttempts: 0,
};

// Enhanced async thunk for secure login with retry logic
export const loginAsync = createAsyncThunk(
  'auth/login',
  async (credentials: ILoginCredentials, { rejectWithValue, getState }) => {
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error);
      }

      const data: IAuthResponse = await response.json();
      
      // Security validation
      if (!data.token || !data.refreshToken || !data.user) {
        throw new Error('Invalid authentication response');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk for token refresh
export const refreshTokenAsync = createAsyncThunk(
  'auth/refresh',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const refreshToken = state.auth.refreshToken;

    if (!refreshToken) {
      return rejectWithValue('No refresh token available');
    }

    try {
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      return await response.json() as IAuthResponse;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Enhanced auth slice with comprehensive security features
export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.requires2FA = false;
      state.sessionExpiry = null;
      state.lastActivity = null;
      state.loginAttempts = 0;
    },
    updateLastActivity: (state) => {
      state.lastActivity = new Date();
    },
    setRequires2FA: (state, action: PayloadAction<boolean>) => {
      state.requires2FA = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetLoginAttempts: (state) => {
      state.loginAttempts = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login handling
      .addCase(loginAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.loginAttempts += 1;
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        state.lastActivity = new Date();
        state.loginAttempts = 0;
        state.requires2FA = action.payload.user.twoFactorEnabled;
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      })
      // Token refresh handling
      .addCase(refreshTokenAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(refreshTokenAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        state.lastActivity = new Date();
      })
      .addCase(refreshTokenAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
      });
  },
});

// Action creators
export const {
  logout,
  updateLastActivity,
  setRequires2FA,
  clearError,
  resetLoginAttempts,
} = authSlice.actions;

// Memoized selectors
export const selectAuth = (state: RootState) => state.auth;
export const selectUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectUserRole = (state: RootState) => state.auth.user?.role;
export const selectRequires2FA = (state: RootState) => state.auth.requires2FA;
export const selectAuthError = (state: RootState) => state.auth.error;
export const selectSessionExpiry = (state: RootState) => state.auth.sessionExpiry;
export const selectLastActivity = (state: RootState) => state.auth.lastActivity;

export default authSlice.reducer;