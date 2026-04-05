/**
 * Security Middleware
 * 
 * Provides rate limiting, input sanitization, and validation
 * for API endpoints.
 * 
 * **Validates: Requirements 9.1-9.9 (Security)**
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { DatabaseManager } from '../../storage/database.js';

/**
 * Rate limiter for report endpoints
 * Limits to 10 requests per minute per IP
 * Can be disabled by setting DISABLE_RATE_LIMIT environment variable
 */
export const reportRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.'
    }
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: () => process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true'
});

/**
 * Sanitize string input to prevent injection attacks
 * Removes potentially dangerous characters
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove null bytes, control characters, and potentially dangerous characters
  return input
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim();
}

/**
 * Validate airport ID format
 * Airport IDs should be alphanumeric with underscores
 */
export function isValidAirportId(airportId: string): boolean {
  if (!airportId || typeof airportId !== 'string') {
    return false;
  }
  
  // Airport IDs should be alphanumeric with underscores, hyphens, and dots
  // Length between 1 and 100 characters
  const airportIdRegex = /^[a-zA-Z0-9_\-\.]{1,100}$/;
  return airportIdRegex.test(airportId);
}

/**
 * Validate node ID format
 * Node IDs should be alphanumeric with underscores
 */
export function isValidNodeId(nodeId: string): boolean {
  if (!nodeId || typeof nodeId !== 'string') {
    return false;
  }
  
  // Node IDs should be alphanumeric with underscores, hyphens, and dots
  // Length between 1 and 100 characters
  const nodeIdRegex = /^[a-zA-Z0-9_\-\.]{1,100}$/;
  return nodeIdRegex.test(nodeId);
}

/**
 * Middleware to validate and sanitize airport ID parameter
 */
export function validateAirportIdParam(db: DatabaseManager) {
  return (req: Request, res: Response, next: NextFunction) => {
    const airportIdParam = req.params.airportId;
    
    // Ensure it's a string (not an array)
    if (Array.isArray(airportIdParam)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_AIRPORT_ID',
          message: 'Invalid airport ID format'
        }
      });
    }
    
    const airportId = airportIdParam as string;
    
    // Validate format
    if (!isValidAirportId(airportId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_AIRPORT_ID',
          message: 'Invalid airport ID format'
        }
      });
    }
    
    // Sanitize
    const sanitizedId = sanitizeString(airportId);
    req.params.airportId = sanitizedId;
    
    // Validate existence in database
    const airports = db.getAirports();
    const airport = airports.find(a => a.id === sanitizedId);
    
    if (!airport) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'AIRPORT_NOT_FOUND',
          message: `Airport with ID '${sanitizedId}' not found`
        }
      });
    }
    
    next();
  };
}

/**
 * Middleware to validate and sanitize node ID parameter
 */
export function validateNodeIdParam(db: DatabaseManager) {
  return (req: Request, res: Response, next: NextFunction) => {
    const nodeIdParam = req.params.nodeId;
    
    // Ensure it's a string (not an array)
    if (Array.isArray(nodeIdParam)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_NODE_ID',
          message: 'Invalid node ID format'
        }
      });
    }
    
    const nodeId = nodeIdParam as string;
    
    // Validate format
    if (!isValidNodeId(nodeId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_NODE_ID',
          message: 'Invalid node ID format'
        }
      });
    }
    
    // Sanitize
    const sanitizedId = sanitizeString(nodeId);
    req.params.nodeId = sanitizedId;
    
    // Validate existence in database
    const airports = db.getAirports();
    let nodeExists = false;
    
    for (const airport of airports) {
      const node = airport.nodes.find(n => n.id === sanitizedId);
      if (node) {
        nodeExists = true;
        break;
      }
    }
    
    if (!nodeExists) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NODE_NOT_FOUND',
          message: `Node with ID '${sanitizedId}' not found`
        }
      });
    }
    
    next();
  };
}

/**
 * Middleware to validate and sanitize query parameters
 */
export function validateQueryParams(req: Request, res: Response, next: NextFunction) {
  const { startTime, endTime } = req.query;
  
  // Sanitize startTime if provided
  if (startTime) {
    if (typeof startTime !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUERY_PARAM',
          message: 'startTime must be a string'
        }
      });
    }
    
    const sanitized = sanitizeString(startTime);
    req.query.startTime = sanitized;
    
    // Validate date format
    const date = new Date(sanitized);
    if (isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TIME_FORMAT',
          message: 'Invalid startTime format. Use ISO 8601 format.'
        }
      });
    }
  }
  
  // Sanitize endTime if provided
  if (endTime) {
    if (typeof endTime !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUERY_PARAM',
          message: 'endTime must be a string'
        }
      });
    }
    
    const sanitized = sanitizeString(endTime);
    req.query.endTime = sanitized;
    
    // Validate date format
    const date = new Date(sanitized);
    if (isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TIME_FORMAT',
          message: 'Invalid endTime format. Use ISO 8601 format.'
        }
      });
    }
  }
  
  next();
}
