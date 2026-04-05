/**
 * Comprehensive Error Handling Utilities
 * 
 * Provides centralized error handling, classification, and graceful degradation
 * for the detailed airport quality reports feature.
 * 
 * **Validates: Requirements 1.6, 9.7, 9.8**
 */

import { Response } from 'express';
import { ErrorCodes } from '../models/api-responses.js';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Custom error class with additional context
 */
export class ReportError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    public details?: any,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'ReportError';
  }
}

/**
 * Warning message for partial data scenarios
 */
export interface Warning {
  code: string;
  message: string;
  severity: ErrorSeverity;
  context?: any;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    severity?: ErrorSeverity;
  };
  warnings?: Warning[];
}

/**
 * Success response with optional warnings
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: any;
  warnings?: Warning[];
}

/**
 * Classify error and determine appropriate HTTP status code
 */
export function classifyError(error: Error | ReportError): {
  statusCode: number;
  errorCode: string;
  severity: ErrorSeverity;
  recoverable: boolean;
} {
  // Handle custom ReportError
  if (error instanceof ReportError) {
    const statusCode = getStatusCodeForErrorCode(error.code);
    return {
      statusCode,
      errorCode: error.code,
      severity: error.severity,
      recoverable: error.recoverable
    };
  }

  // Classify standard errors
  const message = error.message.toLowerCase();

  // Time range validation errors
  if (message.includes('time') && (message.includes('before') || message.includes('after') || message.includes('future'))) {
    return {
      statusCode: 400,
      errorCode: ErrorCodes.INVALID_TIME_RANGE,
      severity: ErrorSeverity.LOW,
      recoverable: true
    };
  }

  // Not found errors
  if (message.includes('not found') || message.includes('does not exist')) {
    return {
      statusCode: 404,
      errorCode: message.includes('airport') ? ErrorCodes.AIRPORT_NOT_FOUND : ErrorCodes.NODE_NOT_FOUND,
      severity: ErrorSeverity.LOW,
      recoverable: false
    };
  }

  // Insufficient data errors
  if (message.includes('insufficient') || message.includes('no data') || message.includes('empty')) {
    return {
      statusCode: 200, // Return 200 with warning instead of error
      errorCode: ErrorCodes.INSUFFICIENT_DATA,
      severity: ErrorSeverity.LOW,
      recoverable: true
    };
  }

  // Invalid parameter errors
  if (message.includes('invalid') || message.includes('malformed') || message.includes('parse')) {
    return {
      statusCode: 400,
      errorCode: ErrorCodes.INVALID_PARAMETERS,
      severity: ErrorSeverity.LOW,
      recoverable: true
    };
  }

  // Database errors
  if (message.includes('database') || message.includes('sql') || message.includes('query')) {
    return {
      statusCode: 500,
      errorCode: ErrorCodes.DATABASE_ERROR,
      severity: ErrorSeverity.HIGH,
      recoverable: false
    };
  }

  // Default: internal server error
  return {
    statusCode: 500,
    errorCode: ErrorCodes.DATABASE_ERROR,
    severity: ErrorSeverity.CRITICAL,
    recoverable: false
  };
}

/**
 * Get HTTP status code for error code
 */
function getStatusCodeForErrorCode(errorCode: string): number {
  const statusMap: Record<string, number> = {
    [ErrorCodes.INVALID_TIME_RANGE]: 400,
    [ErrorCodes.INVALID_PARAMETERS]: 400,
    [ErrorCodes.AIRPORT_NOT_FOUND]: 404,
    [ErrorCodes.NODE_NOT_FOUND]: 404,
    [ErrorCodes.INSUFFICIENT_DATA]: 200, // Return success with warning
    [ErrorCodes.DATABASE_ERROR]: 500
  };

  return statusMap[errorCode] || 500;
}

/**
 * Handle API error and send appropriate response
 * 
 * **Validates: Requirements 9.7, 9.8**
 */
export function handleApiError(
  error: Error | ReportError,
  res: Response,
  context?: string
): void {
  const classification = classifyError(error);

  // Log error with context
  console.error(`[API Error]${context ? ` [${context}]` : ''}`, {
    message: error.message,
    code: classification.errorCode,
    severity: classification.severity,
    recoverable: classification.recoverable,
    stack: error.stack
  });

  // Build error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: classification.errorCode,
      message: error.message,
      severity: classification.severity
    }
  };

  // Include details for development (exclude in production)
  if (process.env.NODE_ENV !== 'production' && error instanceof ReportError && error.details) {
    errorResponse.error.details = error.details;
  }

  res.status(classification.statusCode).json(errorResponse);
}

/**
 * Create warning for insufficient data scenarios
 * 
 * **Validates: Requirements 1.6**
 */
export function createInsufficientDataWarning(
  dataType: string,
  available: number,
  recommended: number,
  context?: string
): Warning {
  return {
    code: 'INSUFFICIENT_DATA',
    message: `Insufficient ${dataType}: only ${available} data points available (minimum ${recommended} recommended)${context ? `. ${context}` : ''}`,
    severity: ErrorSeverity.LOW,
    context: {
      dataType,
      available,
      recommended
    }
  };
}

/**
 * Create warning for partial data failures
 */
export function createPartialFailureWarning(
  component: string,
  reason: string
): Warning {
  return {
    code: 'PARTIAL_FAILURE',
    message: `${component} unavailable: ${reason}`,
    severity: ErrorSeverity.MEDIUM,
    context: {
      component,
      reason
    }
  };
}

/**
 * Graceful degradation wrapper for async operations
 * Returns partial results with warnings instead of failing completely
 * 
 * **Validates: Requirements 1.6, 9.7**
 */
export async function withGracefulDegradation<T>(
  operation: () => Promise<T>,
  fallbackValue: T,
  componentName: string,
  warnings: Warning[]
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    // Log the error
    console.warn(`[Graceful Degradation] ${componentName} failed:`, error.message);

    // Add warning
    warnings.push(createPartialFailureWarning(componentName, error.message));

    // Return fallback value
    return fallbackValue;
  }
}

/**
 * Validate and handle insufficient data scenarios
 * 
 * **Validates: Requirements 1.6**
 */
export function handleInsufficientData<T>(
  data: T[],
  minRequired: number,
  dataType: string,
  warnings: Warning[],
  context?: string
): { hasEnoughData: boolean; data: T[] } {
  if (data.length < minRequired) {
    warnings.push(createInsufficientDataWarning(
      dataType,
      data.length,
      minRequired,
      context
    ));
    return {
      hasEnoughData: false,
      data
    };
  }

  return {
    hasEnoughData: true,
    data
  };
}

/**
 * Wrap response with warnings
 */
export function wrapResponseWithWarnings<T>(
  data: T,
  warnings: Warning[],
  meta?: any
): SuccessResponse<T> {
  const response: SuccessResponse<T> = {
    success: true,
    data
  };

  if (meta) {
    response.meta = meta;
  }

  if (warnings.length > 0) {
    response.warnings = warnings;
  }

  return response;
}

/**
 * Try-catch wrapper with automatic error handling
 */
export async function tryCatchWrapper<T>(
  operation: () => Promise<T>,
  res: Response,
  context: string
): Promise<T | void> {
  try {
    return await operation();
  } catch (error: any) {
    handleApiError(error, res, context);
  }
}

/**
 * Validate required parameters
 */
export function validateRequiredParams(
  params: Record<string, any>,
  required: string[]
): void {
  const missing = required.filter(key => params[key] === undefined || params[key] === null);
  
  if (missing.length > 0) {
    throw new ReportError(
      `Missing required parameters: ${missing.join(', ')}`,
      ErrorCodes.INVALID_PARAMETERS,
      ErrorSeverity.LOW,
      { missing }
    );
  }
}

/**
 * Validate parameter types
 */
export function validateParamTypes(
  params: Record<string, any>,
  types: Record<string, string>
): void {
  const invalid: string[] = [];

  for (const [key, expectedType] of Object.entries(types)) {
    const value = params[key];
    if (value !== undefined && value !== null) {
      const actualType = typeof value;
      if (actualType !== expectedType) {
        invalid.push(`${key} (expected ${expectedType}, got ${actualType})`);
      }
    }
  }

  if (invalid.length > 0) {
    throw new ReportError(
      `Invalid parameter types: ${invalid.join(', ')}`,
      ErrorCodes.INVALID_PARAMETERS,
      ErrorSeverity.LOW,
      { invalid }
    );
  }
}

/**
 * Create error for missing resource
 */
export function createNotFoundError(
  resourceType: string,
  resourceId: string
): ReportError {
  const errorCode = resourceType === 'airport' 
    ? ErrorCodes.AIRPORT_NOT_FOUND 
    : ErrorCodes.NODE_NOT_FOUND;

  return new ReportError(
    `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} '${resourceId}' not found`,
    errorCode,
    ErrorSeverity.LOW,
    { resourceType, resourceId },
    false
  );
}

/**
 * Create error for invalid time range
 */
export function createTimeRangeError(reason: string): ReportError {
  return new ReportError(
    `Invalid time range: ${reason}`,
    ErrorCodes.INVALID_TIME_RANGE,
    ErrorSeverity.LOW,
    { reason },
    true
  );
}

/**
 * Create error for database operation failure
 */
export function createDatabaseError(operation: string, details?: any): ReportError {
  return new ReportError(
    `Database error during ${operation}`,
    ErrorCodes.DATABASE_ERROR,
    ErrorSeverity.HIGH,
    details,
    false
  );
}
