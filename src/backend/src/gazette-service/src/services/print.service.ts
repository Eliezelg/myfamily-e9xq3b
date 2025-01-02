/**
 * @fileoverview Professional print service implementation with comprehensive error handling
 * and quality assurance for gazette printing operations
 * @version 1.0.0
 */

import { Injectable } from '@nestjs/common'; // ^9.0.0
import axios, { AxiosInstance } from 'axios'; // ^1.3.0
import { UUID } from 'crypto';

import { GazetteModel } from '../models/gazette.model';
import { LayoutService } from './layout.service';
import { printConfig } from '../config/print.config';
import { GazetteStatus } from '../../../shared/interfaces/gazette.interface';

interface PrintJobResponse {
  jobId: string;
  status: string;
  estimatedCompletionTime: Date;
}

interface PrintJobStatus {
  status: string;
  progress: number;
  message: string;
  completionTime?: Date;
}

@Injectable()
export class PrintService {
  private readonly httpClient: AxiosInstance;
  private readonly retryAttempts = 3;
  private readonly retryDelay = 1000; // ms

  constructor(
    private readonly gazetteModel: GazetteModel,
    private readonly layoutService: LayoutService
  ) {
    // Initialize HTTP client with print service configuration
    this.httpClient = axios.create({
      baseURL: printConfig.apiUrl,
      headers: {
        'Authorization': `Bearer ${printConfig.apiKey}`,
        'Content-Type': 'application/pdf',
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      response => response,
      error => this.handleApiError(error)
    );
  }

  /**
   * Submits a gazette for printing with comprehensive validation and error handling
   */
  async submitPrintJob(gazetteId: UUID): Promise<boolean> {
    try {
      // Retrieve and validate gazette
      const gazette = await this.gazetteModel.findById(gazetteId);
      if (!gazette) {
        throw new Error('Gazette not found');
      }

      // Validate print readiness
      await this.validatePrintReadiness(gazetteId);

      // Generate print-ready PDF
      const pdfBuffer = await this.layoutService.generateLayout(gazetteId);

      // Submit to print service with retry mechanism
      let attempts = 0;
      let lastError: Error | null = null;

      while (attempts < this.retryAttempts) {
        try {
          const response = await this.httpClient.post<PrintJobResponse>(
            '/print-jobs',
            pdfBuffer,
            {
              params: {
                gazetteId: gazetteId.toString(),
                paperStock: printConfig.paperStock,
                binding: printConfig.binding,
                colorProfile: printConfig.colorProfile
              }
            }
          );

          // Update gazette status
          await this.gazetteModel.updateStatus(gazetteId, GazetteStatus.PRINTING);

          // Initialize print job tracking
          await this.initializePrintTracking(gazetteId, response.data.jobId);

          return true;
        } catch (error) {
          lastError = error;
          attempts++;
          if (attempts < this.retryAttempts) {
            await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempts));
          }
        }
      }

      // Handle final failure after retries
      throw lastError || new Error('Failed to submit print job after retries');

    } catch (error) {
      await this.handlePrintError(gazetteId, error);
      throw error;
    }
  }

  /**
   * Checks the status of a print job with detailed progress tracking
   */
  async checkPrintStatus(gazetteId: UUID): Promise<GazetteStatus> {
    try {
      const gazette = await this.gazetteModel.findById(gazetteId);
      if (!gazette) {
        throw new Error('Gazette not found');
      }

      const response = await this.httpClient.get<PrintJobStatus>(
        `/print-jobs/${gazetteId}/status`
      );

      // Map print service status to gazette status
      const statusMapping: { [key: string]: GazetteStatus } = {
        'queued': GazetteStatus.PRINTING,
        'printing': GazetteStatus.PRINTING,
        'shipped': GazetteStatus.SHIPPED,
        'delivered': GazetteStatus.DELIVERED,
        'failed': GazetteStatus.ERROR
      };

      const newStatus = statusMapping[response.data.status] || GazetteStatus.ERROR;
      
      if (newStatus !== gazette.status) {
        await this.gazetteModel.updateStatus(gazetteId, newStatus);
      }

      return newStatus;
    } catch (error) {
      await this.handlePrintError(gazetteId, error);
      throw error;
    }
  }

  /**
   * Performs comprehensive validation of gazette print readiness
   */
  async validatePrintReadiness(gazetteId: UUID): Promise<boolean> {
    const gazette = await this.gazetteModel.findById(gazetteId);
    if (!gazette) {
      throw new Error('Gazette not found');
    }

    // Validate layout specifications
    await this.layoutService.validateLayout(gazette.layout);

    // Validate content completeness
    if (!gazette.contentIds.length) {
      throw new Error('Gazette has no content');
    }

    // Validate status
    if (gazette.status !== GazetteStatus.READY_FOR_PRINT) {
      throw new Error(`Invalid gazette status: ${gazette.status}`);
    }

    return true;
  }

  /**
   * Comprehensive error handling for print job failures with recovery mechanisms
   */
  private async handlePrintError(gazetteId: UUID, error: Error): Promise<void> {
    console.error(`Print error for gazette ${gazetteId}:`, error);

    try {
      // Update gazette status to ERROR
      await this.gazetteModel.updateStatus(gazetteId, GazetteStatus.ERROR);

      // Log detailed error information
      const errorDetails = {
        gazetteId,
        timestamp: new Date(),
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      };

      // Store error details for analysis
      await this.httpClient.post('/error-logs', errorDetails);

    } catch (loggingError) {
      console.error('Failed to log print error:', loggingError);
    }
  }

  /**
   * Handles API errors with specific error types
   */
  private handleApiError(error: any): Promise<never> {
    const errorMessage = error.response?.data?.message || error.message;
    const errorCode = error.response?.status;

    switch (errorCode) {
      case 400:
        throw new Error(`Invalid print job request: ${errorMessage}`);
      case 401:
        throw new Error('Print service authentication failed');
      case 403:
        throw new Error('Unauthorized access to print service');
      case 429:
        throw new Error('Print service rate limit exceeded');
      default:
        throw new Error(`Print service error: ${errorMessage}`);
    }
  }

  /**
   * Initializes print job tracking
   */
  private async initializePrintTracking(
    gazetteId: UUID,
    printJobId: string
  ): Promise<void> {
    await this.httpClient.post('/print-tracking', {
      gazetteId: gazetteId.toString(),
      printJobId,
      startTime: new Date(),
      status: GazetteStatus.PRINTING
    });
  }
}