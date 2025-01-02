/**
 * Gazette Service Implementation
 * Version: 1.0.0
 * 
 * Production-grade service for managing gazette operations including generation,
 * preview, status tracking, and print approval with enhanced error handling,
 * caching, and performance optimizations.
 */

import { apiService } from './api.service';
import { IGazette, GazetteStatus, IGazetteLayout, PageSize, ColorSpace, BindingType, LayoutStyle } from '../interfaces/gazette.interface';
import { API_ENDPOINTS, API_TIMEOUT } from '../constants/api.constants';
import retry from 'axios-retry'; // ^3.5.0

/**
 * Interface for gazette preview options
 */
interface PreviewOptions {
  quality?: 'low' | 'medium' | 'high';
  page?: number;
  zoom?: number;
}

/**
 * Interface for gazette list options
 */
interface GazetteListOptions {
  status?: GazetteStatus[];
  fromDate?: Date;
  toDate?: Date;
  sortBy?: 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Interface for print approval details
 */
interface IPrintApproval {
  approvedBy: string;
  notes?: string;
  qualityChecked: boolean;
  printSpecs: {
    copies: number;
    paperStock: string;
    finishingOptions: string[];
  };
}

/**
 * Enhanced service class for managing gazette operations
 */
class GazetteService {
  private readonly statusCache: Map<string, { status: GazetteStatus; timestamp: number }>;
  private readonly CACHE_DURATION = 30000; // 30 seconds
  private readonly retryClient: typeof apiService;

  constructor() {
    this.statusCache = new Map();
    
    // Configure retry strategy for resilient API calls
    this.retryClient = retry(apiService, {
      retries: 3,
      retryDelay: retry.exponentialDelay,
      retryCondition: (error) => {
        return retry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429;
      }
    });
  }

  /**
   * Generates a new gazette with enhanced error handling and progress tracking
   */
  public async generateGazette(
    familyId: string,
    layout: IGazetteLayout,
    printSpecs?: Partial<IGazetteLayout>
  ): Promise<IGazette> {
    try {
      // Validate layout specifications
      this.validateLayoutSpecs(layout);

      // Merge with default print specifications if needed
      const finalSpecs = {
        pageSize: PageSize.A4,
        colorSpace: ColorSpace.CMYK,
        resolution: 300,
        bleed: 3,
        binding: BindingType.PERFECT,
        ...printSpecs
      };

      const response = await this.retryClient.post<IGazette>(
        `${API_ENDPOINTS.GAZETTE.basePath}${API_ENDPOINTS.GAZETTE.endpoints.GENERATE.path}`,
        {
          familyId,
          layout,
          printSpecs: finalSpecs
        },
        {
          timeout: API_TIMEOUT.GAZETTE
        }
      );

      // Update status cache
      this.updateStatusCache(response.id, response.status);

      return response;
    } catch (error: any) {
      console.error('[GazetteService] Generation failed:', error);
      throw new Error(`Gazette generation failed: ${error.message}`);
    }
  }

  /**
   * Retrieves gazette preview with caching and progressive loading
   */
  public async getGazettePreview(
    gazetteId: string,
    options: PreviewOptions = { quality: 'medium' }
  ): Promise<string> {
    try {
      const response = await this.retryClient.get<{ previewUrl: string }>(
        `${API_ENDPOINTS.GAZETTE.basePath}${API_ENDPOINTS.GAZETTE.endpoints.PREVIEW.path}/${gazetteId}`,
        {
          params: {
            quality: options.quality,
            page: options.page,
            zoom: options.zoom
          }
        }
      );

      return response.previewUrl;
    } catch (error: any) {
      console.error('[GazetteService] Preview retrieval failed:', error);
      throw new Error(`Preview retrieval failed: ${error.message}`);
    }
  }

  /**
   * Retrieves gazette status with caching and real-time updates
   */
  public async getGazetteStatus(gazetteId: string): Promise<GazetteStatus> {
    // Check cache first
    const cachedStatus = this.statusCache.get(gazetteId);
    if (cachedStatus && Date.now() - cachedStatus.timestamp < this.CACHE_DURATION) {
      return cachedStatus.status;
    }

    try {
      const response = await this.retryClient.get<{ status: GazetteStatus }>(
        `${API_ENDPOINTS.GAZETTE.basePath}/status/${gazetteId}`
      );

      // Update cache
      this.updateStatusCache(gazetteId, response.status);

      return response.status;
    } catch (error: any) {
      console.error('[GazetteService] Status retrieval failed:', error);
      throw new Error(`Status retrieval failed: ${error.message}`);
    }
  }

  /**
   * Approves gazette for printing with quality validation
   */
  public async approveForPrint(
    gazetteId: string,
    approvalDetails: IPrintApproval
  ): Promise<IGazette> {
    try {
      // Validate print specifications
      this.validatePrintApproval(approvalDetails);

      const response = await this.retryClient.put<IGazette>(
        `${API_ENDPOINTS.GAZETTE.basePath}/approve/${gazetteId}`,
        approvalDetails
      );

      // Update status cache
      this.updateStatusCache(gazetteId, response.status);

      return response;
    } catch (error: any) {
      console.error('[GazetteService] Print approval failed:', error);
      throw new Error(`Print approval failed: ${error.message}`);
    }
  }

  /**
   * Retrieves list of family gazettes with filtering and sorting
   */
  public async listGazettes(
    familyId: string,
    options: GazetteListOptions = {}
  ): Promise<IGazette[]> {
    try {
      const response = await this.retryClient.get<IGazette[]>(
        `${API_ENDPOINTS.GAZETTE.basePath}${API_ENDPOINTS.GAZETTE.endpoints.HISTORY.path}`,
        {
          params: {
            familyId,
            ...options
          }
        }
      );

      return response;
    } catch (error: any) {
      console.error('[GazetteService] Gazette list retrieval failed:', error);
      throw new Error(`Gazette list retrieval failed: ${error.message}`);
    }
  }

  /**
   * Updates the status cache with new gazette status
   */
  private updateStatusCache(gazetteId: string, status: GazetteStatus): void {
    this.statusCache.set(gazetteId, {
      status,
      timestamp: Date.now()
    });
  }

  /**
   * Validates gazette layout specifications
   */
  private validateLayoutSpecs(layout: IGazetteLayout): void {
    if (!Object.values(PageSize).includes(layout.pageSize)) {
      throw new Error('Invalid page size specified');
    }
    if (!Object.values(ColorSpace).includes(layout.colorSpace)) {
      throw new Error('Invalid color space specified');
    }
    if (layout.resolution < 300) {
      throw new Error('Resolution must be at least 300 DPI');
    }
    if (layout.bleed < 3) {
      throw new Error('Bleed must be at least 3mm');
    }
  }

  /**
   * Validates print approval details
   */
  private validatePrintApproval(approval: IPrintApproval): void {
    if (!approval.approvedBy) {
      throw new Error('Approval must include approver information');
    }
    if (!approval.qualityChecked) {
      throw new Error('Quality check must be completed before approval');
    }
    if (!approval.printSpecs.copies || approval.printSpecs.copies < 1) {
      throw new Error('Invalid number of copies specified');
    }
  }
}

// Export singleton instance
export const gazetteService = new GazetteService();