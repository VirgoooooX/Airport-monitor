# Implementation Plan: Airport Node Monitor Enhancement

## Overview

This implementation plan converts the feature design into actionable coding tasks. The plan follows a 4-phase approach prioritizing core enhancements first, then subscription features, statistics/export capabilities, and finally deployment optimizations. Each task builds incrementally on previous work, with checkpoints to validate progress.

## Tasks

### Phase 1: Core Enhancements (High Priority)

- [~] 1. Extend data models and database schema for multi-dimensional checks
  - [x] 1.1 Add new TypeScript interfaces for enhanced checking
    - Create `CheckDimensionResult` interface in `src/types/models.ts`
    - Create `EnhancedCheckResult` interface extending `CheckResult`
    - Create `CheckConfig` interface with timeout and URL configurations
    - Add `CheckDimension` type: `'tcp' | 'http' | 'latency' | 'bandwidth'`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.8_
  
  - [x] 1.2 Extend database schema for check dimensions
    - Add `check_dimensions` table in `src/storage/database.ts`
    - Add methods: `saveCheckDimensions()`, `getCheckDimensions()`
    - Update `saveCheckResult()` to handle enhanced results
    - _Requirements: 3.7, 3.8, 5.2_
  
  - [ ]* 1.3 Write unit tests for new data models
    - Test interface type safety
    - Test database schema creation
    - Test CRUD operations for check dimensions
    - _Requirements: 3.7, 5.2_

- [x] 2. Implement HTTP check strategy
  - [x] 2.1 Create CheckStrategy interface and base implementations
    - Create `src/checker/strategies/` directory
    - Define `CheckStrategy` interface
    - Create `TCPCheckStrategy` class (refactor existing logic)
    - _Requirements: 3.2, 4.1_
  
  - [x] 2.2 Implement HTTPCheckStrategy
    - Create `HTTPCheckStrategy` class in `src/checker/strategies/http-check.ts`
    - Use node-fetch to send HTTP requests through proxy
    - Support HTTP/HTTPS test URLs (default: https://www.google.com/generate_204)
    - Handle timeouts and errors
    - Return `CheckDimensionResult` with success status and response time
    - _Requirements: 3.3, 3.9, 3.11, 4.2_
  
  - [ ]* 2.3 Write unit tests for HTTPCheckStrategy
    - Test successful HTTP checks
    - Test timeout handling
    - Test error scenarios (connection refused, DNS failure)
    - _Requirements: 3.3, 3.9_

- [x] 3. Implement latency check strategy
  - [x] 3.1 Implement LatencyCheckStrategy
    - Create `LatencyCheckStrategy` class in `src/checker/strategies/latency-check.ts`
    - Measure TCP handshake time (RTT)
    - Perform 3 measurements and calculate average
    - Handle timeouts
    - _Requirements: 3.4, 3.9, 4.3_
  
  - [ ]* 3.2 Write unit tests for LatencyCheckStrategy
    - Test latency measurement accuracy
    - Test timeout handling
    - Test average calculation
    - _Requirements: 3.4_

- [x] 4. Refactor AvailabilityChecker to use strategy pattern
  - [x] 4.1 Create EnhancedAvailabilityChecker
    - Refactor `src/checker/availability-checker.ts`
    - Initialize strategy map with TCP, HTTP, and Latency strategies
    - Implement `checkNode()` to execute strategies sequentially
    - Execute HTTP and Latency only if TCP succeeds
    - Aggregate results into `EnhancedCheckResult`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.10_
  
  - [x] 4.2 Update MonitorController to use enhanced checker
    - Update `src/controller/monitor-controller.ts`
    - Pass `CheckConfig` to checker constructor
    - Handle `EnhancedCheckResult` in check loop
    - _Requirements: 3.1, 3.6_
  
  - [ ]* 4.3 Write integration tests for enhanced checker
    - Test full check flow with all dimensions
    - Test early termination when TCP fails
    - Test concurrent node checking
    - _Requirements: 3.1, 3.10_

- [x] 5. Checkpoint - Validate multi-dimensional checking
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement alert rule data models and storage
  - [x] 6.1 Add alert-related TypeScript interfaces
    - Create `AlertRule` interface in `src/types/models.ts`
    - Create `Alert` interface with severity levels
    - Add `AlertType` enum: `'node_failure_rate' | 'airport_availability' | 'consecutive_failures'`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [x] 6.2 Extend database schema for alerts
    - Add `alert_rules` table in `src/storage/database.ts`
    - Add `alerts` table
    - Add methods: `saveAlertRule()`, `getAlertRules()`, `saveAlert()`, `getAlerts()`
    - _Requirements: 7.7, 5.2_
  
  - [ ]* 6.3 Write unit tests for alert storage
    - Test alert rule CRUD operations
    - Test alert history storage
    - _Requirements: 7.7_

- [~] 7. Implement AlertManager core logic
  - [x] 7.1 Create AlertManager class
    - Create `src/alert/alert-manager.ts`
    - Implement rule registration: `addRule()`, `removeRule()`
    - Implement `evaluateRules()` method
    - Implement cooldown tracking with `lastAlertTime` map
    - _Requirements: 7.1, 7.5_
  
  - [x] 7.2 Implement node failure rate evaluation
    - Implement `evaluateNodeFailureRate()` method
    - Query node statistics from database (last 24 hours)
    - Compare failure rate against threshold
    - Generate alerts with appropriate severity
    - _Requirements: 7.2_
  
  - [x] 7.3 Implement consecutive failures evaluation
    - Implement `evaluateConsecutiveFailures()` method
    - Track consecutive failure count per node
    - Trigger alert when threshold exceeded
    - _Requirements: 7.4_
  
  - [ ]* 7.4 Write unit tests for AlertManager
    - Test rule evaluation logic
    - Test cooldown mechanism
    - Test alert generation
    - _Requirements: 7.1, 7.2, 7.4, 7.5_

- [~] 8. Integrate AlertManager into monitoring flow
  - [x] 8.1 Wire AlertManager into MonitorController
    - Initialize AlertManager in `src/controller/monitor-controller.ts`
    - Call `evaluateRules()` after each check cycle
    - Load alert rules from configuration
    - _Requirements: 7.1_
  
  - [x] 8.2 Update MonitorConfig to include alert rules
    - Add `alertRules: AlertRule[]` to `MonitorConfig` interface
    - Update configuration loading in `src/config/configuration-manager.ts`
    - _Requirements: 7.1, 11.5_
  
  - [ ]* 8.3 Write integration tests for alert flow
    - Test end-to-end alert triggering
    - Test alert cooldown behavior
    - _Requirements: 7.1, 7.5_

- [~] 9. Add alert API endpoints
  - [x] 9.1 Implement alert REST API
    - Add `GET /api/alerts` endpoint in `src/api/server.ts`
    - Add `GET /api/alerts/:id` endpoint
    - Add `POST /api/alerts/:id/acknowledge` endpoint
    - Add `GET /api/alert-rules` endpoint
    - Add `POST /api/alert-rules` endpoint
    - Add `PUT /api/alert-rules/:id` endpoint
    - Add `DELETE /api/alert-rules/:id` endpoint
    - _Requirements: 7.6, 8.9, 13.10, 13.11_
  
  - [ ]* 9.2 Write API integration tests for alerts
    - Test alert retrieval
    - Test alert acknowledgment
    - Test alert rule CRUD operations
    - _Requirements: 13.10, 13.11_

- [~] 10. Implement frontend alert center UI
  - [x] 10.1 Create AlertCenter component
    - Create `frontend/src/components/AlertCenter.tsx`
    - Display alert icon with unacknowledged count badge
    - Implement dropdown alert list
    - Show alert message, severity, and timestamp
    - Add acknowledge button
    - _Requirements: 7.6, 8.10_
  
  - [x] 10.2 Create AlertRulesPanel component
    - Create `frontend/src/components/AlertRulesPanel.tsx`
    - Display list of alert rules
    - Add create/edit/delete rule forms
    - Include rule type, threshold, and cooldown inputs
    - _Requirements: 8.9_
  
  - [x] 10.3 Integrate AlertCenter into App layout
    - Add AlertCenter to top navigation bar in `frontend/src/App.tsx`
    - Fetch alerts from API periodically (every 30 seconds)
    - Update badge count on new alerts
    - _Requirements: 7.6, 8.10_

- [x] 11. Checkpoint - Validate alert system
  - Ensure all tests pass, ask the user if questions arise.

### Phase 2: Subscription Enhancements (Medium Priority)

- [~] 12. Implement Clash subscription format parser
  - [x] 12.1 Create subscription format parser interfaces
    - Create `src/parser/formats/` directory
    - Define `SubscriptionFormatParser` interface
    - Create `Base64SubscriptionParser` (refactor existing logic)
    - _Requirements: 1.3_
  
  - [x] 12.2 Implement ClashSubscriptionParser
    - Create `ClashSubscriptionParser` class in `src/parser/formats/clash-parser.ts`
    - Parse YAML format using `yaml` package
    - Extract proxies array
    - Support multiple protocol types in Clash format
    - _Requirements: 1.3, 1.4_
  
  - [ ]* 12.3 Write unit tests for ClashSubscriptionParser
    - Test YAML parsing
    - Test proxy extraction
    - Test error handling for invalid YAML
    - _Requirements: 1.3, 14.2_

- [~] 13. Implement additional protocol parsers
  - [x] 13.1 Create protocol parser interfaces
    - Create `src/parser/protocols/` directory
    - Define `ProtocolParser` interface
    - _Requirements: 1.4_
  
  - [x] 13.2 Implement VMessProtocolParser
    - Create `VMessProtocolParser` class
    - Parse vmess:// URI format (base64 JSON)
    - Extract server, port, id, alterId, security, network
    - _Requirements: 1.4_
  
  - [x] 13.3 Implement TrojanProtocolParser
    - Create `TrojanProtocolParser` class
    - Parse trojan:// URI format
    - Extract password, server, port, SNI
    - _Requirements: 1.4_
  
  - [x] 13.4 Implement VLESSProtocolParser
    - Create `VLESSProtocolParser` class
    - Parse vless:// URI format
    - Extract UUID, server, port, encryption, flow
    - _Requirements: 1.4_
  
  - [x] 13.5 Implement HysteriaProtocolParser
    - Create `HysteriaProtocolParser` class
    - Parse hysteria:// URI format
    - Extract server, port, auth, protocol
    - _Requirements: 1.4_
  
  - [ ]* 13.6 Write unit tests for protocol parsers
    - Test each protocol parser with valid URIs
    - Test error handling for malformed URIs
    - _Requirements: 1.4, 14.2_

- [~] 14. Refactor SubscriptionParser to support multiple formats
  - [-] 14.1 Update EnhancedSubscriptionParser
    - Refactor `src/parser/subscription-parser.ts`
    - Initialize format parser array (Base64, Clash)
    - Implement format detection logic in `parseSubscription()`
    - Try each parser until one succeeds
    - _Requirements: 1.2, 1.3_
  
  - [~] 14.2 Initialize protocol parser map
    - Create protocol parser instances
    - Map protocol prefixes to parsers
    - Use parsers in format parsers
    - _Requirements: 1.4_
  
  - [ ]* 14.3 Write integration tests for subscription parsing
    - Test Base64 format parsing
    - Test Clash format parsing
    - Test mixed protocol support
    - _Requirements: 1.2, 1.3, 1.4_

- [~] 15. Implement subscription auto-update scheduler
  - [~] 15.1 Add subscription update data models
    - Add `SubscriptionUpdateConfig` interface to `src/types/models.ts`
    - Add `SubscriptionUpdate` interface for update history
    - Update `Airport` interface to include `updateInterval` field
    - _Requirements: 2.1, 2.6_
  
  - [~] 15.2 Extend database schema for subscription updates
    - Add `subscription_updates` table in `src/storage/database.ts`
    - Add methods: `saveSubscriptionUpdate()`, `getSubscriptionUpdates()`
    - Update `airports` table to include `update_interval` column
    - _Requirements: 2.6, 5.2_
  
  - [~] 15.3 Create SubscriptionUpdateScheduler class
    - Create `src/scheduler/subscription-update-scheduler.ts`
    - Implement `start()` and `stop()` methods
    - Use setInterval for periodic updates
    - Implement `updateAllSubscriptions()` method
    - _Requirements: 2.1, 2.2_
  
  - [~] 15.4 Implement subscription diff logic
    - Implement `updateSubscription()` method
    - Fetch new subscription content
    - Compare with existing nodes (identify added/removed)
    - Save new nodes to database
    - Mark removed nodes (preserve history)
    - Record update history
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [ ]* 15.5 Write unit tests for subscription update scheduler
    - Test update interval scheduling
    - Test node diff logic
    - Test update history recording
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

- [~] 16. Integrate subscription update scheduler
  - [~] 16.1 Wire scheduler into MonitorController
    - Initialize SubscriptionUpdateScheduler in `src/controller/monitor-controller.ts`
    - Start scheduler when monitoring starts
    - Stop scheduler when monitoring stops
    - _Requirements: 2.1_
  
  - [~] 16.2 Update configuration to include update settings
    - Add `subscriptionUpdate` to `MonitorConfig`
    - Load update interval from configuration
    - _Requirements: 2.1, 11.5_
  
  - [~] 16.3 Add manual refresh API endpoint
    - Add `POST /api/subscriptions/:id/refresh` endpoint
    - Trigger immediate subscription update
    - _Requirements: 1.7_
  
  - [ ]* 16.4 Write integration tests for subscription updates
    - Test automatic update scheduling
    - Test manual refresh trigger
    - _Requirements: 2.1, 2.2_

- [~] 17. Checkpoint - Validate subscription enhancements
  - Ensure all tests pass, ask the user if questions arise.

### Phase 3: Statistics and Export (Medium Priority)

- [~] 18. Add node metadata support
  - [~] 18.1 Add metadata data models
    - Add `NodeMetadata` interface to `src/types/models.ts`
    - Include region, country, city, protocolType fields
    - _Requirements: 5.3, 6.6, 6.7_
  
  - [~] 18.2 Extend database schema for metadata
    - Add `node_metadata` table in `src/storage/database.ts`
    - Add methods: `saveNodeMetadata()`, `getNodeMetadata()`
    - _Requirements: 5.3_
  
  - [~] 18.3 Implement metadata extraction logic
    - Extract region/country from node name or config
    - Use heuristics or mapping tables
    - Save metadata when parsing subscriptions
    - _Requirements: 5.3_
  
  - [ ]* 18.4 Write unit tests for metadata extraction
    - Test region detection
    - Test country detection
    - _Requirements: 5.3_

- [~] 19. Implement regional and protocol statistics
  - [~] 19.1 Add statistics interfaces
    - Add `RegionalStatistics` interface to `src/types/models.ts`
    - Add `ProtocolStatistics` interface
    - _Requirements: 6.6, 6.7_
  
  - [~] 19.2 Implement regional statistics in ReportGenerator
    - Add `generateRegionalReport()` method in `src/report/report-generator.ts`
    - Group nodes by region
    - Calculate aggregate statistics per region
    - Include country-level breakdown
    - _Requirements: 6.6, 6.8_
  
  - [~] 19.3 Implement protocol statistics in ReportGenerator
    - Add `generateProtocolReport()` method
    - Group nodes by protocol type
    - Calculate aggregate statistics per protocol
    - _Requirements: 6.7, 6.8_
  
  - [ ]* 19.4 Write unit tests for statistics generation
    - Test regional grouping and aggregation
    - Test protocol grouping and aggregation
    - _Requirements: 6.6, 6.7_

- [~] 20. Implement stability score calculation
  - [~] 20.1 Add stability score data models
    - Add `StabilityScore` interface to `src/types/models.ts`
    - _Requirements: 6.5_
  
  - [~] 20.2 Extend database schema for stability scores
    - Add `node_stability_scores` table in `src/storage/database.ts`
    - Add methods: `saveStabilityScore()`, `getStabilityScore()`
    - _Requirements: 6.5_
  
  - [~] 20.3 Implement stability score algorithm
    - Create `src/report/stability-calculator.ts`
    - Calculate score based on availability rate variance
    - Factor in consecutive failure count
    - Score range: 0-100
    - Cache calculated scores in database
    - _Requirements: 6.5_
  
  - [ ]* 20.4 Write unit tests for stability calculator
    - Test score calculation with various patterns
    - Test edge cases (all success, all failure)
    - _Requirements: 6.5_

- [~] 21. Add statistics and export API endpoints
  - [~] 21.1 Implement statistics API endpoints
    - Add `GET /api/reports/by-region` endpoint in `src/api/server.ts`
    - Add `GET /api/reports/by-protocol` endpoint
    - Add `GET /api/nodes/:id/stability` endpoint
    - Support time range query parameters
    - _Requirements: 6.6, 6.7, 6.8, 13.6_
  
  - [~] 21.2 Implement data export API endpoints
    - Add `GET /api/export/report` endpoint
    - Add `GET /api/export/history` endpoint
    - Support format parameter: csv or json
    - Implement CSV serialization logic
    - Implement JSON serialization logic
    - _Requirements: 10.1, 10.2, 10.3, 10.6, 13.12_
  
  - [ ]* 21.3 Write API integration tests for statistics and export
    - Test regional statistics endpoint
    - Test protocol statistics endpoint
    - Test CSV export
    - Test JSON export
    - _Requirements: 13.6, 13.12_

- [~] 22. Implement frontend statistics visualization
  - [~] 22.1 Create NodeFilter component
    - Create `frontend/src/components/NodeFilter.tsx`
    - Add region dropdown filter
    - Add protocol dropdown filter
    - Add search input
    - Emit filter change events
    - _Requirements: 8.11_
  
  - [~] 22.2 Create RegionalStatsPanel component
    - Create `frontend/src/components/RegionalStatsPanel.tsx`
    - Fetch regional statistics from API
    - Display region-wise availability and latency
    - Use charts (bar chart or pie chart)
    - _Requirements: 9.5_
  
  - [~] 22.3 Create ProtocolStatsPanel component
    - Create `frontend/src/components/ProtocolStatsPanel.tsx`
    - Fetch protocol statistics from API
    - Display protocol-wise availability and latency
    - Use charts
    - _Requirements: 9.6_
  
  - [~] 22.4 Add stability score display to NodeCard
    - Update `frontend/src/components/NodeCard.tsx`
    - Fetch and display stability score (0-100)
    - Use color-coded badge or progress bar
    - _Requirements: 9.7_
  
  - [~] 22.5 Create ExportButton component
    - Create `frontend/src/components/ExportButton.tsx`
    - Add CSV export button
    - Add JSON export button
    - Trigger download on click
    - _Requirements: 10.5_
  
  - [~] 22.6 Integrate statistics components into App
    - Add NodeFilter to dashboard header
    - Add RegionalStatsPanel and ProtocolStatsPanel to reports view
    - Add ExportButton to reports view
    - Wire filter events to node list
    - _Requirements: 8.11, 9.5, 9.6, 10.5_

- [~] 23. Checkpoint - Validate statistics and export features
  - Ensure all tests pass, ask the user if questions arise.

### Phase 4: Deployment Optimization (Low Priority)

- [~] 24. Implement bandwidth check strategy (optional)
  - [~] 24.1 Implement BandwidthCheckStrategy
    - Create `BandwidthCheckStrategy` class in `src/checker/strategies/bandwidth-check.ts`
    - Download test file through proxy
    - Measure download speed (KB/s)
    - Support configurable test file size
    - Handle timeouts
    - _Requirements: 3.5, 4.4, 4.5, 4.6_
  
  - [~] 24.2 Integrate bandwidth check into EnhancedAvailabilityChecker
    - Add bandwidth strategy to strategy map
    - Execute only if `bandwidthEnabled` is true
    - _Requirements: 3.5, 4.5_
  
  - [~] 24.3 Update CheckConfig to include bandwidth settings
    - Add `bandwidthEnabled`, `bandwidthTimeout`, `bandwidthTestSize` fields
    - Update configuration loading
    - _Requirements: 4.5, 4.6_
  
  - [ ]* 24.4 Write unit tests for BandwidthCheckStrategy
    - Test bandwidth measurement
    - Test timeout handling
    - _Requirements: 3.5_

- [~] 25. Enhance Docker deployment configuration
  - [~] 25.1 Create multi-stage Dockerfile
    - Create `Dockerfile` in project root
    - Stage 1: Build frontend (Node.js Alpine)
    - Stage 2: Build backend (TypeScript compilation)
    - Stage 3: Production image (minimal runtime)
    - Copy built artifacts
    - _Requirements: 12.1, 12.6_
  
  - [~] 25.2 Create docker-compose.yml
    - Create `docker-compose.yml` in project root
    - Define airport-monitor service
    - Map port 3000
    - Mount data volume
    - Set environment variables
    - Add healthcheck
    - _Requirements: 12.2, 12.4, 12.5_
  
  - [~] 25.3 Add Docker healthcheck
    - Implement health check endpoint: `GET /api/health`
    - Return 200 if system is operational
    - Add healthcheck to Dockerfile
    - _Requirements: 12.3_
  
  - [~] 25.4 Create .dockerignore file
    - Exclude node_modules, dist, data directories
    - Exclude test files and development configs
    - _Requirements: 12.1_

- [~] 26. Add configuration management enhancements
  - [~] 26.1 Implement check config API endpoints
    - Add `GET /api/config/check` endpoint in `src/api/server.ts`
    - Add `PUT /api/config/check` endpoint
    - Return and update CheckConfig
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 13.8_
  
  - [~] 26.2 Create CheckConfigPanel frontend component
    - Create `frontend/src/components/CheckConfigPanel.tsx`
    - Display TCP, HTTP, latency, bandwidth timeout inputs
    - Display HTTP test URL input
    - Display bandwidth enable toggle
    - Add save button
    - _Requirements: 8.6_
  
  - [~] 26.3 Integrate CheckConfigPanel into SettingsPanel
    - Add CheckConfigPanel to `frontend/src/components/SettingsPanel.tsx`
    - Fetch config on mount
    - Update config on save
    - _Requirements: 8.6, 11.6_

- [~] 27. Enhance error handling and logging
  - [~] 27.1 Improve subscription error handling
    - Add try-catch blocks in subscription parsing
    - Return detailed error messages
    - Log errors with stack traces
    - _Requirements: 14.1, 14.2, 14.7_
  
  - [~] 27.2 Improve database error handling
    - Add retry logic for database operations
    - Log database errors with context
    - _Requirements: 14.3, 14.7_
  
  - [~] 27.3 Improve check error handling
    - Capture and log detailed error information in check strategies
    - Store error details in check results
    - _Requirements: 14.4, 14.7_
  
  - [~] 27.4 Add API input validation
    - Validate request parameters in API endpoints
    - Return 400 with error descriptions for invalid input
    - _Requirements: 14.5_
  
  - [~] 27.5 Display errors in frontend
    - Add error toast notifications
    - Display error messages in UI components
    - _Requirements: 14.6_

- [~] 28. Final checkpoint - Complete system validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements from the requirements document for traceability
- Checkpoints are placed at the end of each phase to ensure incremental validation
- The implementation assumes the existing codebase structure and builds upon it
- All code should be written in TypeScript following the existing project conventions
- Database operations use sql.js (SQLite) as per the current implementation
- API endpoints follow RESTful conventions
- Frontend components use React with TypeScript and Tailwind CSS

