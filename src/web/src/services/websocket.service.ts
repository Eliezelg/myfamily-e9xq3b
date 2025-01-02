/**
 * WebSocket Service Implementation
 * Version: 1.0.0
 * 
 * Handles real-time communication between frontend and backend services
 * with comprehensive event handling, security, and monitoring features.
 */

import { io, Socket } from 'socket.io-client'; // ^4.6.0
import { store } from '../store';
import { apiConfig } from '../config/api.config';
import { 
  setCurrentGazette,
  updateGazetteStatus 
} from '../store/slices/gazette.slice';
import { 
  updateFamilyMetrics,
  updatePoolUtilization 
} from '../store/slices/family.slice';
import { setFamilyPool } from '../store/slices/payment.slice';

/**
 * WebSocket configuration interface with enhanced security and monitoring
 */
interface WebSocketConfig {
  url: string;
  options: {
    reconnection: boolean;
    reconnectionAttempts: number;
    reconnectionDelay: number;
    timeout: number;
    auth: {
      token: string;
    };
    transports: string[];
    heartbeat: {
      interval: number;
      timeout: number;
    };
    compression: boolean;
    monitoring: {
      latencyThreshold: number;
      errorThreshold: number;
    };
  };
}

/**
 * Type-safe interface for WebSocket event payloads
 */
interface ContentUpdatePayload {
  id: string;
  type: 'PHOTO' | 'TEXT';
  url: string;
  metadata: Record<string, any>;
}

interface GazetteStatusPayload {
  id: string;
  status: string;
  updatedAt: string;
}

interface PoolUpdatePayload {
  familyId: string;
  balance: number;
  currency: string;
  lastUpdated: string;
}

interface FamilyUpdatePayload {
  familyId: string;
  metrics: {
    monthlyActiveMembers: number;
    photoCount: number;
    poolUtilization: number;
  };
}

/**
 * Enhanced WebSocket service with comprehensive features
 */
export class WebSocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private metrics: {
    latency: number[];
    errors: number;
    reconnections: number;
    lastHeartbeat: number;
  };

  constructor(private readonly config: WebSocketConfig) {
    this.metrics = {
      latency: [],
      errors: 0,
      reconnections: 0,
      lastHeartbeat: Date.now()
    };
  }

  /**
   * Establishes WebSocket connection with security and monitoring
   */
  public async connect(): Promise<void> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication token required');
      }

      this.socket = io(this.config.url, {
        ...this.config.options,
        auth: { token },
        extraHeaders: {
          'X-Client-Version': '1.0.0',
          'X-Client-Type': 'web'
        }
      });

      this.setupEventHandlers();
      this.startHeartbeat();
      this.monitorConnection();

    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      throw error;
    }
  }

  /**
   * Safely disconnects WebSocket connection
   */
  public disconnect(): void {
    if (this.socket) {
      this.stopHeartbeat();
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Returns current connection metrics
   */
  public getMetrics() {
    return {
      averageLatency: this.calculateAverageLatency(),
      errorRate: this.metrics.errors,
      reconnections: this.metrics.reconnections,
      uptime: this.calculateUptime()
    };
  }

  /**
   * Sets up comprehensive event handlers with error boundaries
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('[WebSocket] Connected successfully');
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.warn('[WebSocket] Disconnected:', reason);
    });

    this.socket.on('error', (error) => {
      this.metrics.errors++;
      console.error('[WebSocket] Error:', error);
    });

    // Business events with type safety
    this.socket.on('content.new', (payload: ContentUpdatePayload) => {
      try {
        store.dispatch({ type: 'content/addItem', payload });
      } catch (error) {
        console.error('[WebSocket] Content update handling failed:', error);
      }
    });

    this.socket.on('gazette.status', (payload: GazetteStatusPayload) => {
      try {
        store.dispatch(updateGazetteStatus({
          id: payload.id,
          status: payload.status
        }));
      } catch (error) {
        console.error('[WebSocket] Gazette status update failed:', error);
      }
    });

    this.socket.on('pool.update', (payload: PoolUpdatePayload) => {
      try {
        store.dispatch(setFamilyPool({
          familyId: payload.familyId,
          balance: payload.balance,
          currency: payload.currency,
          lastUpdated: new Date(payload.lastUpdated)
        }));
      } catch (error) {
        console.error('[WebSocket] Pool update failed:', error);
      }
    });

    this.socket.on('family.update', (payload: FamilyUpdatePayload) => {
      try {
        store.dispatch(updateFamilyMetrics({
          familyId: payload.familyId,
          metrics: payload.metrics
        }));
      } catch (error) {
        console.error('[WebSocket] Family update failed:', error);
      }
    });
  }

  /**
   * Implements heartbeat monitoring
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      if (!this.socket || !this.isConnected) return;

      const start = Date.now();
      this.socket.emit('heartbeat', null, () => {
        const latency = Date.now() - start;
        this.metrics.latency.push(latency);
        this.metrics.lastHeartbeat = Date.now();

        if (latency > this.config.options.monitoring.latencyThreshold) {
          console.warn('[WebSocket] High latency detected:', latency);
        }
      });
    }, this.config.options.heartbeat.interval);
  }

  /**
   * Stops heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Monitors connection health and performance
   */
  private monitorConnection(): void {
    if (!this.socket) return;

    this.socket.on('reconnect_attempt', () => {
      this.metrics.reconnections++;
      this.reconnectAttempts++;
      console.warn('[WebSocket] Reconnection attempt:', this.reconnectAttempts);
    });

    this.socket.on('reconnect_failed', () => {
      if (this.reconnectAttempts >= this.config.options.reconnectionAttempts) {
        console.error('[WebSocket] Max reconnection attempts reached');
        this.disconnect();
      }
    });
  }

  /**
   * Calculates average connection latency
   */
  private calculateAverageLatency(): number {
    if (this.metrics.latency.length === 0) return 0;
    const sum = this.metrics.latency.reduce((a, b) => a + b, 0);
    return sum / this.metrics.latency.length;
  }

  /**
   * Calculates connection uptime
   */
  private calculateUptime(): number {
    if (!this.metrics.lastHeartbeat) return 0;
    return Date.now() - this.metrics.lastHeartbeat;
  }
}

/**
 * Default WebSocket configuration
 */
const SOCKET_CONFIG: WebSocketConfig = {
  url: apiConfig.baseURL.replace(/^http/, 'ws'),
  options: {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 3000,
    timeout: 10000,
    auth: {
      token: ''
    },
    transports: ['websocket'],
    heartbeat: {
      interval: 30000,
      timeout: 5000
    },
    compression: true,
    monitoring: {
      latencyThreshold: 1000,
      errorThreshold: 5
    }
  }
};

// Export singleton instance
export const websocketService = new WebSocketService(SOCKET_CONFIG);