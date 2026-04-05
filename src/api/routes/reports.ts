/**
 * Report API Routes
 * 
 * API endpoints for detailed airport quality reports.
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9**
 */

import { Request, Response, Router } from 'express';
import { DatabaseManager } from '../../storage/database.js';
import { TimeAnalyzerImpl } from '../../report/analyzers/time-analyzer.js';
import { RegionAnalyzerImpl } from '../../report/analyzers/region-analyzer.js';
import { ProtocolAnalyzerImpl } from '../../report/analyzers/protocol-analyzer.js';
import { QualityCalculatorImpl } from '../../report/calculators/quality-calculator.js';
import { PercentileCalculatorImpl } from '../../report/calculators/percentile-calculator.js';
import { JitterCalculatorImpl } from '../../report/calculators/jitter-calculator.js';
import { calculateMaxConsecutiveFailures } from '../../report/calculators/failure-tracker.js';
import { calculateAvailabilityRate } from '../../report/calculators/availability-calculator.js';
import { classifyHealthStatus } from '../../report/utils/health-classifier.js';
import { validateTimeRange } from '../../report/utils/validators.js';
import { ErrorCodes } from '../../report/models/api-responses.js';
import { DetailedAirportReport, DetailedNodeMetrics } from '../../report/models/report-types.js';
import { StabilityCalculator } from '../../report/stability-calculator.js';
import { 
  reportRateLimiter, 
  validateAirportIdParam, 
  validateNodeIdParam, 
  validateQueryParams 
} from '../middleware/security.js';
import {
  handleApiError,
  withGracefulDegradation,
  handleInsufficientData,
  wrapResponseWithWarnings,
  createTimeRangeError,
  createNotFoundError,
  Warning
} from '../../report/utils/error-handler.js';
import {
  createLogger,
  logReportStart,
  logReportEnd,
  logComponent,
  logDataPoints,
  logWarning
} from '../../report/utils/logger.js';

/**
 * Create report routes
 */
export function createReportRoutes(db: DatabaseManager): Router {
  const router = Router();

  // Initialize analyzers and calculators
  const timeAnalyzer = new TimeAnalyzerImpl(db);
  const regionAnalyzer = new RegionAnalyzerImpl(db);
  const protocolAnalyzer = new ProtocolAnalyzerImpl(db);
  const qualityCalculator = new QualityCalculatorImpl(db);
  const percentileCalculator = new PercentileCalculatorImpl();
  const jitterCalculator = new JitterCalculatorImpl();
  const stabilityCalculator = new StabilityCalculator(db);

  /**
   * Helper function to find a node by ID across all airports
   */
  const findNodeById = (nodeId: string) => {
    const airports = db.getAirports();
    for (const airport of airports) {
      const node = airport.nodes.find(n => n.id === nodeId);
      if (node) return node;
    }
    return null;
  };

  /**
   * GET /api/reports/detailed/:airportId
   * 
   * Get detailed quality report for an airport
   * Query params: startTime, endTime (optional, defaults to last 24 hours)
   * 
   * **Validates: Requirements 9.1, 9.2, 9.7, 9.8, 9.9**
   */
  router.get('/detailed/:airportId', 
    reportRateLimiter,
    validateAirportIdParam(db),
    validateQueryParams,
    async (req: Request, res: Response) => {
    const startQueryTime = Date.now();
    const warnings: Warning[] = [];
    const logger = createLogger('DetailedReportAPI');

    // Generate unique report ID for tracking
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const airportId = req.params.airportId as string;
      const { startTime: startTimeParam, endTime: endTimeParam } = req.query;

      // Parse and validate time range
      const endTime = endTimeParam 
        ? new Date(endTimeParam as string)
        : new Date();
      
      const startTime = startTimeParam
        ? new Date(startTimeParam as string)
        : new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // Default: last 24 hours

      // Validate time range
      try {
        validateTimeRange(startTime, endTime);
      } catch (error: any) {
        throw createTimeRangeError(error.message);
      }

      // Airport existence already validated by middleware
      const airports = db.getAirports();
      const airport = airports.find(a => a.id === airportId);
      
      if (!airport) {
        throw createNotFoundError('airport', airportId);
      }

      // Get all nodes for the airport
      const nodes = db.getNodesByAirport(airportId);

      if (nodes.length === 0) {
        throw createNotFoundError('airport nodes', airportId);
      }

      // Start report metrics tracking
      logReportStart(reportId, airportId, airport.name, startTime, endTime, nodes.length);
      logger.info('Starting detailed report generation', {
        reportId,
        airportId,
        airportName: airport.name,
        nodeCount: nodes.length,
        timeRange: {
          start: startTime.toISOString(),
          end: endTime.toISOString()
        }
      });

      // Generate detailed node metrics with graceful degradation
      const detailedNodes: DetailedNodeMetrics[] = [];
      let totalAvailability = 0;
      let totalLatency = 0;
      let latencyCount = 0;
      let totalDataPoints = 0;

      const nodeProcessingStart = logger.startOperation('Node metrics calculation');

      for (const node of nodes) {
        try {
          const checkResults = await db.getCheckHistory(node.id, startTime, endTime);
          totalDataPoints += checkResults.length;
          logDataPoints(reportId, checkResults.length);

          // Handle insufficient data
          const { hasEnoughData } = handleInsufficientData(
            checkResults,
            10,
            'check results',
            warnings,
            `Node ${node.name} may have incomplete metrics`
          );

          if (!hasEnoughData) {
            logWarning(reportId);
          }

          if (checkResults.length === 0) {
            // Node has no data in this time range - skip but don't fail
            logger.warn(`Node ${node.name} has no data in time range`, { nodeId: node.id });
            continue;
          }

          // Calculate latency percentiles
          const latencyPercentiles = percentileCalculator.calculatePercentiles(checkResults);

          // Calculate availability
          const availabilityRate = calculateAvailabilityRate(checkResults);
          const successfulChecks = checkResults.filter(r => r.available).length;

          // Calculate jitter
          const jitterMetrics = jitterCalculator.calculateJitter(checkResults);

          // Get stability score with graceful degradation
          const stabilityData = await withGracefulDegradation(
            () => stabilityCalculator.getStabilityScore(node.id, 60),
            { nodeId: node.id, score: 0, calculatedAt: new Date() },
            `Stability calculation for node ${node.name}`,
            warnings
          );

          // Calculate max consecutive failures
          const maxConsecutiveFailures = calculateMaxConsecutiveFailures(checkResults);

          // Classify health status
          const healthStatus = classifyHealthStatus(
            availabilityRate,
            latencyPercentiles.mean
          );

          // Calculate quality score for this node with graceful degradation
          const nodeQualityScore = await withGracefulDegradation(
            () => qualityCalculator.calculateQualityScore(node.id, startTime, endTime),
            { overall: 0, availability: 0, latency: 0, stability: 0, weights: { availability: 0.5, latency: 0.3, stability: 0.2 } },
            `Quality score calculation for node ${node.name}`,
            warnings
          );

          // Extract region
          const region = regionAnalyzer.extractRegion(node);

          detailedNodes.push({
            nodeId: node.id,
            nodeName: node.name,
            protocol: node.protocol,
            region,
            latency: latencyPercentiles,
            availability: {
              rate: availabilityRate,
              totalChecks: checkResults.length,
              successfulChecks
            },
            stability: {
              score: stabilityData.score,
              maxConsecutiveFailures
            },
            jitter: jitterMetrics,
            healthStatus,
            qualityScore: nodeQualityScore
          });

          // Accumulate for summary
          totalAvailability += availabilityRate;
          if (latencyPercentiles.mean > 0) {
            totalLatency += latencyPercentiles.mean;
            latencyCount++;
          }
        } catch (nodeError: any) {
          // Log node-level error but continue processing other nodes
          logger.warn(`Error processing node ${node.name}`, { nodeId: node.id }, nodeError);
          logComponent(reportId, `Node ${node.name}`, false);
          warnings.push({
            code: 'NODE_PROCESSING_ERROR',
            message: `Failed to process node ${node.name}: ${nodeError.message}`,
            severity: 'medium' as any
          });
          logWarning(reportId);
        }
      }

      logger.endOperation('Node metrics calculation', nodeProcessingStart, true, detailedNodes.length);
      logComponent(reportId, 'Node metrics', true);

      // Calculate summary metrics
      const avgAvailability = detailedNodes.length > 0
        ? totalAvailability / detailedNodes.length
        : 0;
      
      const avgLatency = latencyCount > 0
        ? totalLatency / latencyCount
        : 0;

      const avgStability = detailedNodes.length > 0
        ? detailedNodes.reduce((sum, n) => sum + n.stability.score, 0) / detailedNodes.length
        : 0;

      // Calculate overall quality score with graceful degradation
      const qualityScoreStart = logger.startOperation('Airport quality score calculation');
      const overallQualityScore = await withGracefulDegradation(
        () => qualityCalculator.calculateAirportQualityScore(airportId, startTime, endTime),
        { airportId, airportName: airport.name, overall: 0, nodeScores: [], ranking: 0 },
        'Airport quality score calculation',
        warnings
      );
      logger.endOperation('Airport quality score calculation', qualityScoreStart, true);
      logComponent(reportId, 'Quality score', true);

      // Generate time dimension analysis with graceful degradation
      const timeAnalysisStart = logger.startOperation('Time dimension analysis');
      const representativeNode = nodes[0];
      const hourlyTrend = await withGracefulDegradation(
        () => timeAnalyzer.generate24HourTrend(representativeNode.id, endTime),
        [],
        '24-hour trend analysis',
        warnings
      );
      
      const dailyTrend = await withGracefulDegradation(
        () => timeAnalyzer.generate7DayTrend(representativeNode.id, endTime),
        [],
        '7-day trend analysis',
        warnings
      );
      
      const peakPeriods = await withGracefulDegradation(
        () => timeAnalyzer.identifyPeakPeriods(airportId, startTime, endTime),
        { highestLatencyPeriod: { startHour: 0, endHour: 0, avgLatency: 0 }, lowestLatencyPeriod: { startHour: 0, endHour: 0, avgLatency: 0 } },
        'Peak period identification',
        warnings
      );
      
      const timeSegments = await withGracefulDegradation(
        () => timeAnalyzer.compareTimeSegments(airportId, startTime, endTime),
        { morning: { avgLatency: 0, p95Latency: 0, availabilityRate: 0, checkCount: 0 }, afternoon: { avgLatency: 0, p95Latency: 0, availabilityRate: 0, checkCount: 0 }, evening: { avgLatency: 0, p95Latency: 0, availabilityRate: 0, checkCount: 0 }, night: { avgLatency: 0, p95Latency: 0, availabilityRate: 0, checkCount: 0 } },
        'Time segment comparison',
        warnings
      );
      logger.endOperation('Time dimension analysis', timeAnalysisStart, true);
      logComponent(reportId, 'Time analysis', true);

      // Generate regional dimension analysis with graceful degradation
      const regionalAnalysisStart = logger.startOperation('Regional dimension analysis');
      const regionalReport = await withGracefulDegradation(
        () => regionAnalyzer.generateRegionalReport(airportId, startTime, endTime),
        { regions: [], totalNodes: 0, generatedAt: new Date() },
        'Regional analysis',
        warnings
      );
      
      const regionalDistribution = regionalReport.regions.map(r => ({
        region: r.region,
        percentage: regionalReport.totalNodes > 0 ? (r.nodeCount / regionalReport.totalNodes) * 100 : 0
      }));
      logger.endOperation('Regional dimension analysis', regionalAnalysisStart, true);
      logComponent(reportId, 'Regional analysis', true);

      // Generate protocol dimension analysis with graceful degradation
      const protocolAnalysisStart = logger.startOperation('Protocol dimension analysis');
      const protocolStats = await withGracefulDegradation(
        () => protocolAnalyzer.groupByProtocol(airportId, startTime, endTime),
        [],
        'Protocol analysis',
        warnings
      );
      
      const protocolDistribution = protocolStats.map(p => ({
        protocol: p.protocol,
        percentage: nodes.length > 0 ? (p.nodeCount / nodes.length) * 100 : 0
      }));
      logger.endOperation('Protocol dimension analysis', protocolAnalysisStart, true);
      logComponent(reportId, 'Protocol analysis', true);

      // Build detailed report
      const report: DetailedAirportReport = {
        airportId: airport.id,
        airportName: airport.name,
        timeRange: {
          start: startTime,
          end: endTime
        },
        generatedAt: new Date(),
        summary: {
          totalNodes: detailedNodes.length,
          avgAvailability: Math.round(avgAvailability * 100) / 100,
          avgLatency: Math.round(avgLatency * 100) / 100,
          qualityScore: overallQualityScore.overall
        },
        timeDimension: {
          hourlyTrend,
          dailyTrend,
          peakPeriods,
          timeSegments
        },
        regionalDimension: {
          regions: regionalReport.regions,
          distribution: regionalDistribution
        },
        protocolDimension: {
          protocols: protocolStats,
          distribution: protocolDistribution
        },
        nodes: detailedNodes,
        qualityScoring: {
          overall: {
            overall: overallQualityScore.overall,
            availability: avgAvailability,
            latency: avgLatency,
            stability: avgStability,
            weights: {
              availability: 0.5,
              latency: 0.3,
              stability: 0.2
            }
          },
          algorithm: 'Weighted average: availability (50%), latency (30%), stability (20%)',
          rankings: [overallQualityScore]
        }
      };

      // Calculate query time
      const queryTime = Date.now() - startQueryTime;

      // Log completion
      logReportEnd(reportId, true);
      logger.info('Completed detailed report generation', {
        reportId,
        duration: queryTime,
        dataPoints: totalDataPoints,
        warnings: warnings.length
      });

      // Return response with warnings if any
      const response = wrapResponseWithWarnings(
        report,
        warnings,
        {
          queryTime,
          dataPoints: totalDataPoints
        }
      );

      res.json(response);

    } catch (error: any) {
      logReportEnd(reportId, false);
      logger.error('Failed to generate detailed report', { reportId }, error);
      handleApiError(error, res, 'detailed report generation');
    }
  });

  /**
   * GET /api/reports/time-analysis/:nodeId
   * 
   * Get time dimension analysis for a specific node
   * Query params: startTime, endTime (optional, defaults to last 24 hours)
   * 
   * **Validates: Requirements 9.3**
   */
  router.get('/time-analysis/:nodeId',
    reportRateLimiter,
    validateNodeIdParam(db),
    validateQueryParams,
    async (req: Request, res: Response) => {
    try {
      const nodeId = req.params.nodeId as string;
      const { startTime: startTimeParam, endTime: endTimeParam } = req.query;

      // Parse and validate time range
      const endTime = endTimeParam 
        ? new Date(endTimeParam as string)
        : new Date();
      
      const startTime = startTimeParam
        ? new Date(startTimeParam as string)
        : new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

      // Validate time range
      try {
        validateTimeRange(startTime, endTime);
      } catch (error: any) {
        return res.status(400).json({
          success: false,
          error: {
            code: ErrorCodes.INVALID_TIME_RANGE,
            message: error.message
          }
        });
      }

      // Node existence already validated by middleware
      const node = findNodeById(nodeId)!;

      // Generate time analysis
      const hourlyTrend = await timeAnalyzer.generate24HourTrend(nodeId, endTime);
      const dailyTrend = await timeAnalyzer.generate7DayTrend(nodeId, endTime);

      res.json({
        success: true,
        data: {
          nodeId: node.id,
          nodeName: node.name,
          hourlyTrend,
          dailyTrend
        }
      });

    } catch (error: any) {
      console.error('[API] Error generating time analysis:', error);
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: 'Internal server error while generating time analysis',
          details: error.message
        }
      });
    }
  });

  /**
   * GET /api/reports/latency-percentiles/:nodeId
   * 
   * Get latency percentiles for a specific node
   * Query params: startTime, endTime (optional, defaults to last 24 hours)
   * 
   * **Validates: Requirements 9.4**
   */
  router.get('/latency-percentiles/:nodeId',
    reportRateLimiter,
    validateNodeIdParam(db),
    validateQueryParams,
    async (req: Request, res: Response) => {
    try {
      const nodeId = req.params.nodeId as string;
      const { startTime: startTimeParam, endTime: endTimeParam } = req.query;

      // Parse and validate time range
      const endTime = endTimeParam 
        ? new Date(endTimeParam as string)
        : new Date();
      
      const startTime = startTimeParam
        ? new Date(startTimeParam as string)
        : new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

      // Validate time range
      try {
        validateTimeRange(startTime, endTime);
      } catch (error: any) {
        return res.status(400).json({
          success: false,
          error: {
            code: ErrorCodes.INVALID_TIME_RANGE,
            message: error.message
          }
        });
      }

      // Node existence already validated by middleware
      const node = findNodeById(nodeId)!;

      // Get check results and calculate percentiles
      const checkResults = await db.getCheckHistory(nodeId, startTime, endTime);
      const percentiles = percentileCalculator.calculatePercentiles(checkResults);

      res.json({
        success: true,
        data: {
          nodeId: node.id,
          nodeName: node.name,
          percentiles,
          timeRange: {
            start: startTime,
            end: endTime
          }
        }
      });

    } catch (error: any) {
      console.error('[API] Error calculating latency percentiles:', error);
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: 'Internal server error while calculating latency percentiles',
          details: error.message
        }
      });
    }
  });

  /**
   * GET /api/reports/stability/:nodeId
   * 
   * Get stability score and jitter for a specific node
   * Query params: startTime, endTime (optional, defaults to last 24 hours)
   * 
   * **Validates: Requirements 9.5**
   */
  router.get('/stability/:nodeId',
    reportRateLimiter,
    validateNodeIdParam(db),
    validateQueryParams,
    async (req: Request, res: Response) => {
    try {
      const nodeId = req.params.nodeId as string;
      const { startTime: startTimeParam, endTime: endTimeParam } = req.query;

      // Parse and validate time range
      const endTime = endTimeParam 
        ? new Date(endTimeParam as string)
        : new Date();
      
      const startTime = startTimeParam
        ? new Date(startTimeParam as string)
        : new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

      // Validate time range
      try {
        validateTimeRange(startTime, endTime);
      } catch (error: any) {
        return res.status(400).json({
          success: false,
          error: {
            code: ErrorCodes.INVALID_TIME_RANGE,
            message: error.message
          }
        });
      }

      // Node existence already validated by middleware
      const node = findNodeById(nodeId)!;

      // Get stability score
      const stabilityData = await stabilityCalculator.getStabilityScore(nodeId, 60);

      // Get check results and calculate jitter
      const checkResults = await db.getCheckHistory(nodeId, startTime, endTime);
      const jitterMetrics = jitterCalculator.calculateJitter(checkResults);

      // Calculate max consecutive failures
      const maxConsecutiveFailures = calculateMaxConsecutiveFailures(checkResults);

      res.json({
        success: true,
        data: {
          nodeId: node.id,
          nodeName: node.name,
          stability: {
            score: stabilityData.score,
            maxConsecutiveFailures,
            calculatedAt: new Date()
          },
          jitter: jitterMetrics
        }
      });

    } catch (error: any) {
      console.error('[API] Error calculating stability:', error);
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: 'Internal server error while calculating stability',
          details: error.message
        }
      });
    }
  });

  /**
   * GET /api/reports/peak-periods/:airportId
   * 
   * Get peak period analysis for an airport
   * Query params: startTime, endTime (optional, defaults to last 24 hours)
   * 
   * **Validates: Requirements 9.6**
   */
  router.get('/peak-periods/:airportId',
    reportRateLimiter,
    validateAirportIdParam(db),
    validateQueryParams,
    async (req: Request, res: Response) => {
    try {
      const airportId = req.params.airportId as string;
      const { startTime: startTimeParam, endTime: endTimeParam } = req.query;

      // Parse and validate time range
      const endTime = endTimeParam 
        ? new Date(endTimeParam as string)
        : new Date();
      
      const startTime = startTimeParam
        ? new Date(startTimeParam as string)
        : new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

      // Validate time range
      try {
        validateTimeRange(startTime, endTime);
      } catch (error: any) {
        return res.status(400).json({
          success: false,
          error: {
            code: ErrorCodes.INVALID_TIME_RANGE,
            message: error.message
          }
        });
      }

      // Airport existence already validated by middleware
      const airports = db.getAirports();
      const airport = airports.find(a => a.id === airportId)!;

      // Generate peak period analysis
      const peakPeriods = await timeAnalyzer.identifyPeakPeriods(airportId, startTime, endTime);
      const timeSegments = await timeAnalyzer.compareTimeSegments(airportId, startTime, endTime);

      res.json({
        success: true,
        data: {
          airportId: airport.id,
          airportName: airport.name,
          peakPeriods,
          timeSegments
        }
      });

    } catch (error: any) {
      console.error('[API] Error analyzing peak periods:', error);
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: 'Internal server error while analyzing peak periods',
          details: error.message
        }
      });
    }
  });

  /**
   * GET /api/reports/quality-score/:airportId
   * 
   * Get quality scores for an airport
   * Query params: startTime, endTime (optional, defaults to last 24 hours)
   * 
   * **Validates: Requirements 9.7, 9.8, 9.9**
   */
  router.get('/quality-score/:airportId',
    reportRateLimiter,
    validateAirportIdParam(db),
    validateQueryParams,
    async (req: Request, res: Response) => {
    try {
      const airportId = req.params.airportId as string;
      const { startTime: startTimeParam, endTime: endTimeParam } = req.query;

      // Parse and validate time range
      const endTime = endTimeParam 
        ? new Date(endTimeParam as string)
        : new Date();
      
      const startTime = startTimeParam
        ? new Date(startTimeParam as string)
        : new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

      // Validate time range
      try {
        validateTimeRange(startTime, endTime);
      } catch (error: any) {
        return res.status(400).json({
          success: false,
          error: {
            code: ErrorCodes.INVALID_TIME_RANGE,
            message: error.message
          }
        });
      }

      // Airport existence already validated by middleware
      const airports = db.getAirports();
      const airport = airports.find(a => a.id === airportId)!;

      // Get all nodes for the airport
      const nodes = db.getNodesByAirport(airportId);

      if (nodes.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: ErrorCodes.AIRPORT_NOT_FOUND,
            message: `Airport '${airport.name}' has no nodes`
          }
        });
      }

      // Calculate airport quality score
      const airportScore = await qualityCalculator.calculateAirportQualityScore(
        airportId,
        startTime,
        endTime
      );

      // Calculate individual node scores
      const nodeScores = [];
      for (const node of nodes) {
        const nodeScore = await qualityCalculator.calculateQualityScore(
          node.id,
          startTime,
          endTime
        );
        nodeScores.push({
          nodeId: node.id,
          nodeName: node.name,
          score: nodeScore
        });
      }

      res.json({
        success: true,
        data: {
          airportScore,
          nodeScores,
          algorithm: {
            description: 'Weighted average: availability (50%), latency (30%), stability (20%)',
            weights: {
              availability: 0.5,
              latency: 0.3,
              stability: 0.2
            }
          }
        }
      });

    } catch (error: any) {
      console.error('[API] Error calculating quality scores:', error);
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: 'Internal server error while calculating quality scores',
          details: error.message
        }
      });
    }
  });

  return router;
}
