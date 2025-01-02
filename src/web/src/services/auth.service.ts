/**
 * Authentication Service
 * Version: 1.0.0
 * 
 * Handles user authentication operations including login, OAuth, 2FA,
 * and token management with enhanced security features and RBAC.
 */

import axios, { AxiosInstance, AxiosError } from 'axios'; // ^1.3.0
import { 
  ILoginCredentials, 
  IAuthResponse,
  IAuthUser,
  ITwoFactorVerification,
  IPasswordReset,
  UserStatus 
} from '../interfaces/auth.interface';
import { apiConfig } from '../config/api.config';
import { API_ENDPOINTS, API_STATUS } from '../constants/api.constants';

/**
 * Authentication service class with enhanced security features
 */
class AuthService {
  private readonly api: AxiosInstance;
  private readonly AUTH_ENDPOINTS = API_ENDPOINTS.AUTH;
  private refreshTokenTimeoutId: NodeJS.Timeout | null = null;

  constructor() {
    this.api = axios.create(apiConfig);
    this.setupInterceptors();
  }

  /**
   * Configure axios interceptors for request/response handling
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        const token = this.getStoredToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          return this.handle401Error(error);
        }
        return Promise.reject(this.formatError(error));
      }
    );
  }

  /**
   * Enhanced user login with security features
   * @param credentials User login credentials
   * @returns Authentication response with tokens and user data
   */
  public async login(credentials: ILoginCredentials): Promise<IAuthResponse> {
    try {
      const response = await this.api.post<IAuthResponse>(
        this.AUTH_ENDPOINTS.endpoints.LOGIN.path,
        credentials
      );

      const authResponse = response.data;
      this.setupAuthentication(authResponse);
      return authResponse;
    } catch (error) {
      throw this.formatError(error as AxiosError);
    }
  }

  /**
   * Handle two-factor authentication verification
   * @param verification 2FA verification data
   * @returns Authentication response
   */
  public async verifyTwoFactor(verification: ITwoFactorVerification): Promise<IAuthResponse> {
    try {
      const response = await this.api.post<IAuthResponse>(
        `${this.AUTH_ENDPOINTS.basePath}/verify-2fa`,
        verification
      );
      
      const authResponse = response.data;
      this.setupAuthentication(authResponse);
      return authResponse;
    } catch (error) {
      throw this.formatError(error as AxiosError);
    }
  }

  /**
   * Refresh authentication tokens
   * @param refreshToken Current refresh token
   * @returns New authentication response
   */
  public async refreshToken(refreshToken: string): Promise<IAuthResponse> {
    try {
      const response = await this.api.post<IAuthResponse>(
        this.AUTH_ENDPOINTS.endpoints.REFRESH.path,
        { refreshToken }
      );

      const authResponse = response.data;
      this.setupAuthentication(authResponse);
      return authResponse;
    } catch (error) {
      this.clearAuthentication();
      throw this.formatError(error as AxiosError);
    }
  }

  /**
   * Validate user permissions against required permissions
   * @param requiredPermissions Array of required permissions
   * @returns Boolean indicating permission status
   */
  public async validatePermissions(requiredPermissions: string[]): Promise<boolean> {
    const user = this.getCurrentUser();
    if (!user || user.status !== UserStatus.ACTIVE) {
      return false;
    }

    try {
      const response = await this.api.post(
        `${this.AUTH_ENDPOINTS.basePath}/validate-permissions`,
        { requiredPermissions }
      );
      return response.data.isAuthorized;
    } catch (error) {
      console.error('Permission validation failed:', error);
      return false;
    }
  }

  /**
   * Initiate password reset process
   * @param resetData Password reset request data
   * @returns Success status
   */
  public async requestPasswordReset(resetData: IPasswordReset): Promise<boolean> {
    try {
      await this.api.post(
        `${this.AUTH_ENDPOINTS.basePath}/request-reset`,
        resetData
      );
      return true;
    } catch (error) {
      throw this.formatError(error as AxiosError);
    }
  }

  /**
   * Handle 401 Unauthorized errors
   * @param error Axios error object
   * @returns Promise with new request attempt
   */
  private async handle401Error(error: AxiosError): Promise<any> {
    const refreshToken = this.getStoredRefreshToken();
    
    if (!refreshToken || error.config?.url?.includes('refresh')) {
      this.clearAuthentication();
      throw error;
    }

    try {
      const authResponse = await this.refreshToken(refreshToken);
      const config = error.config!;
      config.headers.Authorization = `Bearer ${authResponse.token}`;
      return this.api.request(config);
    } catch (refreshError) {
      this.clearAuthentication();
      throw refreshError;
    }
  }

  /**
   * Setup authentication state after successful login/refresh
   * @param authResponse Authentication response data
   */
  private setupAuthentication(authResponse: IAuthResponse): void {
    const { token, refreshToken, expiresIn } = authResponse;
    
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    
    if (this.refreshTokenTimeoutId) {
      clearTimeout(this.refreshTokenTimeoutId);
    }

    // Setup automatic token refresh
    this.refreshTokenTimeoutId = setTimeout(
      () => this.refreshToken(refreshToken),
      (expiresIn - 60) * 1000 // Refresh 1 minute before expiration
    );
  }

  /**
   * Clear authentication state
   */
  private clearAuthentication(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    
    if (this.refreshTokenTimeoutId) {
      clearTimeout(this.refreshTokenTimeoutId);
      this.refreshTokenTimeoutId = null;
    }
  }

  /**
   * Get stored JWT token
   * @returns Stored token or null
   */
  private getStoredToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Get stored refresh token
   * @returns Stored refresh token or null
   */
  private getStoredRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  /**
   * Get current authenticated user
   * @returns Current user or null
   */
  private getCurrentUser(): IAuthUser | null {
    const token = this.getStoredToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.user;
    } catch {
      return null;
    }
  }

  /**
   * Format error response for consistent error handling
   * @param error Axios error object
   * @returns Formatted error object
   */
  private formatError(error: AxiosError): Error {
    const response = error.response?.data as any;
    return new Error(
      response?.message || 'Authentication failed. Please try again.'
    );
  }
}

// Export singleton instance
export const authService = new AuthService();