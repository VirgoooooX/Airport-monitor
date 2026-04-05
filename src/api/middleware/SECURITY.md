# Security Middleware Documentation

## Overview

This module provides comprehensive security measures for the report API endpoints, including rate limiting, input sanitization, and validation.

## Features

### 1. Rate Limiting

**Implementation**: `reportRateLimiter`

- **Limit**: 10 requests per minute per IP address
- **Window**: 60 seconds (1 minute)
- **Response**: Returns 429 status code with error message when limit exceeded
- **Headers**: Includes standard `RateLimit-*` headers for client information
- **Test Environment**: Automatically disabled when `NODE_ENV=test` or `DISABLE_RATE_LIMIT=true`

**Usage**:
```typescript
router.get('/api/reports/detailed/:airportId', 
  reportRateLimiter,
  // ... other middleware
);
```

**Disabling in Tests**:
The rate limiter is automatically disabled in test environments to prevent test failures. Set `NODE_ENV=test` or `DISABLE_RATE_LIMIT=true` to disable.

### 2. Input Sanitization

**Function**: `sanitizeString(input: string): string`

Removes potentially dangerous characters from user input:
- Null bytes (`\0`)
- Control characters (`\x00-\x1F`, `\x7F`)
- Leading/trailing whitespace

**Example**:
```typescript
const clean = sanitizeString('test\0string'); // Returns: 'teststring'
```

### 3. ID Format Validation

#### Airport ID Validation

**Function**: `isValidAirportId(airportId: string): boolean`

- Accepts: Alphanumeric characters, underscores, hyphens, dots
- Length: 1-100 characters
- Pattern: `/^[a-zA-Z0-9_\-\.]{1,100}$/`

**Valid Examples**:
- `airport_123`
- `test-airport`
- `Airport.Test`

**Invalid Examples**:
- `airport/test` (contains slash)
- `airport test` (contains space)
- `airport@test` (contains special character)

#### Node ID Validation

**Function**: `isValidNodeId(nodeId: string): boolean`

- Same rules as airport ID validation
- Pattern: `/^[a-zA-Z0-9_\-\.]{1,100}$/`

### 4. Database Validation Middleware

#### Airport ID Parameter Validation

**Middleware**: `validateAirportIdParam(db: DatabaseManager)`

Validates airport ID in URL parameters:
1. Checks if parameter is a string (not array)
2. Validates format using `isValidAirportId()`
3. Sanitizes the input
4. Verifies airport exists in database
5. Returns 400 for invalid format, 404 if not found

**Usage**:
```typescript
router.get('/api/reports/detailed/:airportId',
  reportRateLimiter,
  validateAirportIdParam(db),
  // ... handler
);
```

#### Node ID Parameter Validation

**Middleware**: `validateNodeIdParam(db: DatabaseManager)`

Validates node ID in URL parameters:
1. Checks if parameter is a string (not array)
2. Validates format using `isValidNodeId()`
3. Sanitizes the input
4. Verifies node exists in database
5. Returns 400 for invalid format, 404 if not found

**Usage**:
```typescript
router.get('/api/reports/time-analysis/:nodeId',
  reportRateLimiter,
  validateNodeIdParam(db),
  // ... handler
);
```

### 5. Query Parameter Validation

**Middleware**: `validateQueryParams`

Validates and sanitizes query parameters:
- **startTime**: Must be valid ISO 8601 date string
- **endTime**: Must be valid ISO 8601 date string
- Sanitizes both parameters
- Returns 400 for invalid formats

**Usage**:
```typescript
router.get('/api/reports/detailed/:airportId',
  reportRateLimiter,
  validateAirportIdParam(db),
  validateQueryParams,
  // ... handler
);
```

## Protected Endpoints

All report endpoints are protected with the security middleware:

1. `GET /api/reports/detailed/:airportId`
   - Rate limiting
   - Airport ID validation
   - Query parameter validation

2. `GET /api/reports/time-analysis/:nodeId`
   - Rate limiting
   - Node ID validation
   - Query parameter validation

3. `GET /api/reports/latency-percentiles/:nodeId`
   - Rate limiting
   - Node ID validation
   - Query parameter validation

4. `GET /api/reports/stability/:nodeId`
   - Rate limiting
   - Node ID validation
   - Query parameter validation

5. `GET /api/reports/peak-periods/:airportId`
   - Rate limiting
   - Airport ID validation
   - Query parameter validation

6. `GET /api/reports/quality-score/:airportId`
   - Rate limiting
   - Airport ID validation
   - Query parameter validation

## Error Responses

### Rate Limit Exceeded (429)
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later."
  }
}
```

### Invalid Airport ID Format (400)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_AIRPORT_ID",
    "message": "Invalid airport ID format"
  }
}
```

### Airport Not Found (404)
```json
{
  "success": false,
  "error": {
    "code": "AIRPORT_NOT_FOUND",
    "message": "Airport with ID 'xxx' not found"
  }
}
```

### Invalid Node ID Format (400)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_NODE_ID",
    "message": "Invalid node ID format"
  }
}
```

### Node Not Found (404)
```json
{
  "success": false,
  "error": {
    "code": "NODE_NOT_FOUND",
    "message": "Node with ID 'xxx' not found"
  }
}
```

### Invalid Time Format (400)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TIME_FORMAT",
    "message": "Invalid startTime format. Use ISO 8601 format."
  }
}
```

## Security Best Practices

1. **Rate Limiting**: Prevents abuse and DoS attacks by limiting requests per IP
2. **Input Sanitization**: Removes dangerous characters that could lead to injection attacks
3. **Format Validation**: Ensures IDs match expected patterns before database queries
4. **Database Validation**: Verifies resources exist before processing requests
5. **Error Messages**: Provides clear feedback without exposing sensitive information

## Testing

Comprehensive test suite covers:
- String sanitization edge cases
- ID format validation (valid and invalid cases)
- Middleware behavior (success and error paths)
- Database validation
- Query parameter validation

Run tests:
```bash
npm test -- tests/unit/api/security-middleware.test.ts
```

## Dependencies

- `express-rate-limit`: Rate limiting middleware
- `express`: Web framework types

## Future Enhancements

Potential improvements:
- Add authentication/authorization checks
- Implement request signing for API clients
- Add CORS configuration for specific origins
- Implement request logging for security auditing
- Add IP whitelisting/blacklisting
- Implement more sophisticated rate limiting (per user, per endpoint)
