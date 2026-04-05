/**
 * Security Middleware Tests
 * 
 * Tests for rate limiting, input sanitization, and validation
 */

import { Request, Response, NextFunction } from 'express';
import {
  sanitizeString,
  isValidAirportId,
  isValidNodeId,
  validateAirportIdParam,
  validateNodeIdParam,
  validateQueryParams
} from '../../../src/api/middleware/security.js';
import { DatabaseManager } from '../../../src/storage/database.js';
import { NodeProtocol } from '../../../src/types/enums.js';
import * as path from 'path';
import * as fs from 'fs';

describe('Security Middleware', () => {
  describe('sanitizeString', () => {
    it('should remove null bytes', () => {
      const input = 'test\0string';
      const result = sanitizeString(input);
      expect(result).toBe('teststring');
    });

    it('should remove control characters', () => {
      const input = 'test\x01\x02string';
      const result = sanitizeString(input);
      expect(result).toBe('teststring');
    });

    it('should trim whitespace', () => {
      const input = '  test string  ';
      const result = sanitizeString(input);
      expect(result).toBe('test string');
    });

    it('should handle empty string', () => {
      const result = sanitizeString('');
      expect(result).toBe('');
    });

    it('should return empty string for non-string input', () => {
      const result = sanitizeString(123 as any);
      expect(result).toBe('');
    });
  });

  describe('isValidAirportId', () => {
    it('should accept valid airport IDs', () => {
      expect(isValidAirportId('airport_123')).toBe(true);
      expect(isValidAirportId('test-airport')).toBe(true);
      expect(isValidAirportId('airport.test')).toBe(true);
      expect(isValidAirportId('Airport_Test_123')).toBe(true);
    });

    it('should reject invalid airport IDs', () => {
      expect(isValidAirportId('')).toBe(false);
      expect(isValidAirportId('airport/test')).toBe(false);
      expect(isValidAirportId('airport test')).toBe(false);
      expect(isValidAirportId('airport@test')).toBe(false);
      expect(isValidAirportId('a'.repeat(101))).toBe(false); // Too long
    });

    it('should reject non-string inputs', () => {
      expect(isValidAirportId(null as any)).toBe(false);
      expect(isValidAirportId(undefined as any)).toBe(false);
      expect(isValidAirportId(123 as any)).toBe(false);
    });
  });

  describe('isValidNodeId', () => {
    it('should accept valid node IDs', () => {
      expect(isValidNodeId('node_123')).toBe(true);
      expect(isValidNodeId('test-node')).toBe(true);
      expect(isValidNodeId('node.test')).toBe(true);
      expect(isValidNodeId('Node_Test_123')).toBe(true);
    });

    it('should reject invalid node IDs', () => {
      expect(isValidNodeId('')).toBe(false);
      expect(isValidNodeId('node/test')).toBe(false);
      expect(isValidNodeId('node test')).toBe(false);
      expect(isValidNodeId('node@test')).toBe(false);
      expect(isValidNodeId('n'.repeat(101))).toBe(false); // Too long
    });

    it('should reject non-string inputs', () => {
      expect(isValidNodeId(null as any)).toBe(false);
      expect(isValidNodeId(undefined as any)).toBe(false);
      expect(isValidNodeId(123 as any)).toBe(false);
    });
  });

  describe('validateAirportIdParam middleware', () => {
    let db: DatabaseManager;
    const testDbPath = path.join(__dirname, '../../temp/test-security-airport.db');

    beforeEach(async () => {
      // Clean up any existing test database
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }

      db = await DatabaseManager.create(testDbPath);

      // Add test airport
      db.saveAirport({
        id: 'test_airport',
        name: 'Test Airport',
        subscriptionUrl: 'https://example.com/sub',
        nodes: [],
        createdAt: new Date()
      });
    });

    afterEach(() => {
      db.close();
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    });

    it('should pass validation for valid airport ID', () => {
      const middleware = validateAirportIdParam(db);
      const req = {
        params: { airportId: 'test_airport' }
      } as any as Request;
      const res = {} as Response;
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.params.airportId).toBe('test_airport');
    });

    it('should reject invalid airport ID format', () => {
      const middleware = validateAirportIdParam(db);
      const req = {
        params: { airportId: 'invalid/airport' }
      } as any as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any as Response;
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_AIRPORT_ID',
          message: 'Invalid airport ID format'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject non-existent airport ID', () => {
      const middleware = validateAirportIdParam(db);
      const req = {
        params: { airportId: 'nonexistent_airport' }
      } as any as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any as Response;
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AIRPORT_NOT_FOUND',
          message: "Airport with ID 'nonexistent_airport' not found"
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject array airport ID', () => {
      const middleware = validateAirportIdParam(db);
      const req = {
        params: { airportId: ['test', 'airport'] }
      } as any as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any as Response;
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateNodeIdParam middleware', () => {
    let db: DatabaseManager;
    const testDbPath = path.join(__dirname, '../../temp/test-security-node.db');

    beforeEach(async () => {
      // Clean up any existing test database
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }

      db = await DatabaseManager.create(testDbPath);

      // Add test airport with node
      const airport = {
        id: 'test_airport',
        name: 'Test Airport',
        subscriptionUrl: 'https://example.com/sub',
        createdAt: new Date(),
        nodes: []
      };
      db.saveAirport(airport);
      
      // Save node separately
      db.saveNode({
        id: 'test_node',
        name: 'Test Node',
        address: '127.0.0.1',
        port: 8080,
        protocol: NodeProtocol.VMESS,
        airportId: 'test_airport',
        config: {}
      });
    });

    afterEach(() => {
      db.close();
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    });

    it('should pass validation for valid node ID', () => {
      const middleware = validateNodeIdParam(db);
      
      // Verify node exists in database
      const airports = db.getAirports();
      const nodes = airports.flatMap(a => a.nodes);
      
      const req = {
        params: { nodeId: 'test_node' }
      } as any as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any as Response;
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.params.nodeId).toBe('test_node');
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject invalid node ID format', () => {
      const middleware = validateNodeIdParam(db);
      const req = {
        params: { nodeId: 'invalid/node' }
      } as any as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any as Response;
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_NODE_ID',
          message: 'Invalid node ID format'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject non-existent node ID', () => {
      const middleware = validateNodeIdParam(db);
      const req = {
        params: { nodeId: 'nonexistent_node' }
      } as any as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any as Response;
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NODE_NOT_FOUND',
          message: "Node with ID 'nonexistent_node' not found"
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject array node ID', () => {
      const middleware = validateNodeIdParam(db);
      const req = {
        params: { nodeId: ['test', 'node'] }
      } as any as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any as Response;
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateQueryParams middleware', () => {
    it('should pass validation for valid query params', () => {
      const req = {
        query: {
          startTime: '2024-01-01T00:00:00Z',
          endTime: '2024-01-02T00:00:00Z'
        }
      } as any as Request;
      const res = {} as Response;
      const next = jest.fn();

      validateQueryParams(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should pass validation when query params are missing', () => {
      const req = {
        query: {}
      } as any as Request;
      const res = {} as Response;
      const next = jest.fn();

      validateQueryParams(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject invalid startTime format', () => {
      const req = {
        query: {
          startTime: 'invalid-date'
        }
      } as any as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any as Response;
      const next = jest.fn();

      validateQueryParams(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_TIME_FORMAT',
          message: 'Invalid startTime format. Use ISO 8601 format.'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid endTime format', () => {
      const req = {
        query: {
          endTime: 'invalid-date'
        }
      } as any as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any as Response;
      const next = jest.fn();

      validateQueryParams(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_TIME_FORMAT',
          message: 'Invalid endTime format. Use ISO 8601 format.'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should sanitize query params', () => {
      const req = {
        query: {
          startTime: '  2024-01-01T00:00:00Z  ',
          endTime: '2024-01-02T00:00:00Z\x00'
        }
      } as any as Request;
      const res = {} as Response;
      const next = jest.fn();

      validateQueryParams(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.query.startTime).toBe('2024-01-01T00:00:00Z');
      expect(req.query.endTime).toBe('2024-01-02T00:00:00Z');
    });
  });
});
