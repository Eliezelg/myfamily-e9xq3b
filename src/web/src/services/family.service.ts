/**
 * Family Service Implementation
 * Version: 1.0.0
 * 
 * Comprehensive service for managing family-related operations including
 * family creation, member management, pool access, and status tracking
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '../constants/api.constants';
import { 
  IFamily, 
  FamilyStatus, 
  IFamilySettings,
  isFamilyStatus 
} from '../interfaces/family.interface';
import { IFamilyPool } from '../interfaces/payment.interface';
import Logger from '@logger/core'; // ^1.0.0

/**
 * Service class for handling family-related operations
 */
export class FamilyService {
  private readonly logger: Logger;

  constructor(
    private readonly apiService: typeof apiService,
    logger: Logger
  ) {
    this.logger = logger.createScope('FamilyService');
  }

  /**
   * Creates a new family with initial settings
   * @param familyData Initial family configuration
   * @returns Promise resolving to created family data
   */
  public async createFamily(familyData: Partial<IFamily>): Promise<IFamily> {
    try {
      this.logger.info('Creating new family', { familyName: familyData.name });

      const response = await this.apiService.post<IFamily>(
        `${API_ENDPOINTS.FAMILY.basePath}${API_ENDPOINTS.FAMILY.endpoints.CREATE.path}`,
        familyData
      );

      this.logger.info('Family created successfully', { 
        familyId: response.id,
        familyName: response.name 
      });

      return response;
    } catch (error) {
      this.logger.error('Failed to create family', { 
        error,
        familyData 
      });
      throw error;
    }
  }

  /**
   * Retrieves family pool information including balance and settings
   * @param familyId Unique family identifier
   * @returns Promise resolving to family pool data
   */
  public async getFamilyPool(familyId: string): Promise<IFamilyPool> {
    try {
      this.logger.debug('Fetching family pool data', { familyId });

      const response = await this.apiService.get<IFamilyPool>(
        `${API_ENDPOINTS.PAYMENT.basePath}${API_ENDPOINTS.PAYMENT.endpoints.POOL.path}/${familyId}`
      );

      this.logger.debug('Retrieved family pool data', { 
        familyId,
        balance: response.balance,
        currency: response.currency
      });

      return response;
    } catch (error) {
      this.logger.error('Failed to fetch family pool', { 
        error,
        familyId 
      });
      throw error;
    }
  }

  /**
   * Updates family pool settings including payment preferences
   * @param familyId Unique family identifier
   * @param settings Updated pool settings
   * @returns Promise resolving to updated pool data
   */
  public async updatePoolSettings(
    familyId: string,
    settings: Partial<IFamilyPool>
  ): Promise<IFamilyPool> {
    try {
      this.logger.info('Updating family pool settings', { 
        familyId,
        settings 
      });

      const response = await this.apiService.put<IFamilyPool>(
        `${API_ENDPOINTS.PAYMENT.basePath}${API_ENDPOINTS.PAYMENT.endpoints.POOL.path}/${familyId}`,
        settings
      );

      this.logger.info('Family pool settings updated', { 
        familyId,
        newSettings: settings 
      });

      return response;
    } catch (error) {
      this.logger.error('Failed to update pool settings', { 
        error,
        familyId,
        settings 
      });
      throw error;
    }
  }

  /**
   * Updates family status with comprehensive validation
   * @param familyId Unique family identifier
   * @param newStatus Updated family status
   * @returns Promise resolving to updated family data
   */
  public async updateFamilyStatus(
    familyId: string,
    newStatus: FamilyStatus
  ): Promise<IFamily> {
    try {
      // Validate status transition
      if (!isFamilyStatus(newStatus)) {
        throw new Error(`Invalid family status: ${newStatus}`);
      }

      this.logger.info('Updating family status', { 
        familyId,
        newStatus 
      });

      const response = await this.apiService.put<IFamily>(
        `${API_ENDPOINTS.FAMILY.basePath}${API_ENDPOINTS.FAMILY.endpoints.UPDATE.path}/${familyId}`,
        { status: newStatus }
      );

      this.logger.info('Family status updated successfully', { 
        familyId,
        oldStatus: response.status,
        newStatus 
      });

      return response;
    } catch (error) {
      this.logger.error('Failed to update family status', { 
        error,
        familyId,
        newStatus 
      });
      throw error;
    }
  }

  /**
   * Updates family settings including language and preferences
   * @param familyId Unique family identifier
   * @param settings Updated family settings
   * @returns Promise resolving to updated family data
   */
  public async updateFamilySettings(
    familyId: string,
    settings: Partial<IFamilySettings>
  ): Promise<IFamily> {
    try {
      this.logger.info('Updating family settings', { 
        familyId,
        settings 
      });

      const response = await this.apiService.put<IFamily>(
        `${API_ENDPOINTS.FAMILY.basePath}${API_ENDPOINTS.FAMILY.endpoints.UPDATE.path}/${familyId}`,
        { settings }
      );

      this.logger.info('Family settings updated successfully', { 
        familyId,
        newSettings: settings 
      });

      return response;
    } catch (error) {
      this.logger.error('Failed to update family settings', { 
        error,
        familyId,
        settings 
      });
      throw error;
    }
  }
}