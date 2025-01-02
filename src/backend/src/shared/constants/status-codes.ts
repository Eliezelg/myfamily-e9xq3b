/**
 * @fileoverview Standardized HTTP status codes following RFC 7231 specifications
 * Used across all backend microservices for consistent API responses and error handling
 * @see https://tools.ietf.org/html/rfc7231#section-6
 * @version 1.0.0
 */

/**
 * Enumeration of standard HTTP status codes
 * Provides type-safe status codes for API responses and error handling
 * Following REST API best practices and RFC 7231 specifications
 */
export enum HttpStatusCodes {
  /**
   * Request succeeded. Response includes requested data.
   * Used for successful GET, PUT, PATCH, or DELETE operations.
   */
  OK = 200,

  /**
   * Request succeeded and new resource created.
   * Used for successful POST operations that create new resources.
   */
  CREATED = 201,

  /**
   * Request accepted for processing but not yet completed.
   * Used for asynchronous operations like gazette generation.
   */
  ACCEPTED = 202,

  /**
   * Request succeeded but no content returned.
   * Used for successful operations that don't return data.
   */
  NO_CONTENT = 204,

  /**
   * Request failed due to client error (invalid input).
   * Used when request validation fails.
   */
  BAD_REQUEST = 400,

  /**
   * Request failed due to missing or invalid authentication.
   * Used when JWT token is missing or invalid.
   */
  UNAUTHORIZED = 401,

  /**
   * Request failed due to insufficient permissions.
   * Used when authenticated user lacks required role/permissions.
   */
  FORBIDDEN = 403,

  /**
   * Request failed because resource not found.
   * Used when requested entity doesn't exist.
   */
  NOT_FOUND = 404,

  /**
   * Request failed due to resource conflict.
   * Used for duplicate entries or version conflicts.
   */
  CONFLICT = 409,

  /**
   * Request failed due to semantic errors.
   * Used when request is valid but cannot be processed.
   */
  UNPROCESSABLE_ENTITY = 422,

  /**
   * Request failed due to server error.
   * Used for unexpected errors during request processing.
   */
  INTERNAL_SERVER_ERROR = 500,

  /**
   * Request failed because service is unavailable.
   * Used during maintenance or when dependencies are down.
   */
  SERVICE_UNAVAILABLE = 503
}