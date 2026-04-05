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
  router.get('/detailed/:airportId', async (req: Request, res: Response) => {
    const startQueryTime = Date.now();

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
        return res.status(400).json({
          success: false,
          error: {
            code: ErrorCodes.INVALID_TIME_RANGE,
            message: error.message
          }
        });
      }

      // Check if airport exists
      const airports = db.getAirports();
      const airport = airports.find(a => a.id === airportId);
      
      if (!airport) {
        return res.status(404).json({
          success: false,
          error: {
            code: ErrorCodes.AIRPORT_NOT_FOUND,
            message: `Airport with ID '${airportId}' not found`
          }
        });
      }

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

      // Generate detailed node metrics
      const detailedNodes: DetailedNodeMetrics[] = [];
      let totalAvailability = 0;
      let totalLatency = 0;
      let latencyCount = 0;
      let totalDataPoints = 0;

      for (const node of nodes) {
        const checkResults = await db.getCheckHistory(node.id, startTime, endTime);
        totalDataPoints += checkResults.length;

        if (checkResults.length === 0) {
          // Node has no data in this time range
          continue;
        }

        // Calculate latency percentiles
        const latencyPercentiles = percentileCalculator.calculatePercentiles(checkResults);

        // Calculate availability
        const availabilityRate = calculateAvailabilityRate(checkResults);
        const successfulChecks = checkResults.filter(r => r.available).length;

        // Calculate jitter
        const jitterMetrics = jitterCalculator.calculateJitter(checkResults);

        // Get stability score
        const stabilityData = await stabilityCalculator.getStabilityScore(node.id, 60);

        // Calculate max consecutive failures
        const maxConsecutiveFailures = calculateMaxConsecutiveFailures(checkResults);

        // Classify health status
        const healthStatus = classifyHealthStatus(
          availabilityRate,
          latencyPercentiles.mean
        );

        // Calculate quality score for this node
        const nodeQualityScore = await qualityCalculator.calculateQualityScore(
          node.id,
          startTime,
          endTime
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
      }

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

      // Calculate overall quality score
      const overallQualityScore = await qualityCalculator.calculateAirportQualityScore(
        airportId,
        startTime,
        endTime
      );

      // Generate time dimension analysis (using first node as representative)
      const representativeNode = nodes[0];
      const hourlyTrend = await timeAnalyzer.generate24HourTrend(representativeNode.id, endTime);
      const dailyTrend = await timeAnalyzer.generate7DayTrend(representativeNode.id, endTime);
      const peakPeriods = await timeAnalyzer.identifyPeakPeriods(airportId, startTime, endTime);
      const timeSegments = await timeAnalyzer.compareTimeSegments(airportId, startTime, endTime);

      // Generate regional dimension analysis
      const regionalReport = await regionAnalyzer.generateRegionalReport(airportId, startTime, endTime);
      const regionalDistribution = regionalReport.regions.map(r => ({
        region: r.region,
        percentage: (r.nodeCount / regionalReport.totalNodes) * 100
      }));

      // Generate protocol dimension analysis
      const protocolStats = await protocolAnalyzer.groupByProtocol(airportId, startTime, endTime);
      const protocolDistribution = protocolStats.map(p => ({
        protocol: p.protocol,
        percentage: (p.nodeCount / nodes.length) * 100
      }));

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

      res.json({
        success: true,
        data: report,
        meta: {
          queryTime,
          dataPoints: totalDataPoints
        }
      });

    } catch (error: any) {
      console.error('[API] Error generating detailed report:', error);
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCodes.DATABASE_ERROR,
          message: 'Internal server error while generating report',
          details: error.message
        }
      });
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
  router.get('/time-analysis/:nodeId', async (req: Request, res: Response) => {
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

      // Check if node exists
      const node = findNodeById(nodeId);
      if (!node) {
        return res.status(404).json({
          success: false,
          error: {
            code: ErrorCodes.NODE_NOT_FOUND,
            message: `Node with ID '${nodeId}' not found`
          }
        });
      }

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
  router.get('/latency-percentiles/:nodeId', async (req: Request, res: Response) => {
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

      // Check if node exists
      const node = findNodeById(nodeId);
      if (!node) {
        return res.status(404).json({
          success: false,
          error: {
            code: ErrorCodes.NODE_NOT_FOUND,
            message: `Node with ID '${nodeId}' not found`
          }
        });
      }

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
  router.get('/stability/:nodeId', async (req: Request, res: Response) => {
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

      // Check if node exists
      const node = findNodeById(nodeId);
      if (!node) {
        return res.status(404).json({
          success: false,
          error: {
            code: ErrorCodes.NODE_NOT_FOUND,
            message: `Node with ID '${nodeId}' not found`
          }
        });
      }

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
  router.get('/peak-periods/:airportId', async (req: Request, res: Response) => {
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

      // Check if airport exists
      const airports = db.getAirports();
      const airport = airports.find(a => a.id === airportId);
      
      if (!airport) {
        return res.status(404).json({
          success: false,
          error: {
            code: ErrorCodes.AIRPORT_NOT_FOUND,
            message: `Airport with ID '${airportId}' not found`
          }
        });
      }

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
  router.get('/quality-score/:airportId', async (req: Request, res: Response) => {
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

      // Check if airport exists
      const airports = db.getAirports();
      const airport = airports.find(a => a.id === airportId);
      
      if (!airport) {
        return res.status(404).json({
          success: false,
          error: {
            code: ErrorCodes.AIRPORT_NOT_FOUND,
            message: `Airport with ID '${airportId}' not found`
          }
        });
      }

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
