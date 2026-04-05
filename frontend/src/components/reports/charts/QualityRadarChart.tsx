/**
 * QualityRadarChart - Radar chart component for multi-dimensional quality comparison
 * 
 * Displays quality metrics across multiple dimensions:
 * - Availability Score
 * - Latency Score
 * - Stability Score
 * - Overall Quality Score
 * 
 * Supports comparison of multiple airports or nodes on the same chart.
 * 
 * **Validates: Requirements 6.6, 12.1, 12.2, 12.3**
 */

import React from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip } from 'recharts';
import { ChartContainer } from './ChartContainer';
import {
  getChartColor,
  formatScore,
  getTooltipConfig,
  LEGEND_CONFIG
} from './chartConfig';

/**
 * Quality score data for a single entity (airport or node)
 */
export interface QualityScoreData {
  entityId: string;        // Airport ID or Node ID
  entityName: string;      // Display name
  availability: number;    // Availability score (0-100)
  latency: number;         // Latency score (0-100)
  stability: number;       // Stability score (0-100)
  overall: number;         // Overall quality score (0-100)
}

export interface QualityRadarChartProps {
  data: QualityScoreData[];  // Array of entities to compare (max 3 recommended)
  title?: string;
  description?: string;
  height?: number;
  loading?: boolean;
  error?: string;
  showLegend?: boolean;
  className?: string;
}

/**
 * QualityRadarChart component
 * 
 * Displays multi-dimensional quality metrics as a radar chart,
 * allowing visual comparison of multiple entities.
 */
export const QualityRadarChart: React.FC<QualityRadarChartProps> = ({
  data,
  title,
  description,
  height = 400,
  loading = false,
  error,
  showLegend = true,
  className = ''
}) => {
  // Transform data for radar chart format
  // Radar chart expects: [{ metric: 'Availability', entity1: 95, entity2: 87, ... }]
  const metrics = ['Availability', 'Latency', 'Stability', 'Overall'];
  
  const chartData = metrics.map(metric => {
    const dataPoint: any = { metric };
    
    data.forEach(entity => {
      const key = metric.toLowerCase() as keyof QualityScoreData;
      dataPoint[entity.entityName] = entity[key];
    });
    
    return dataPoint;
  });

  // Custom tooltip content
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const tooltipConfig = getTooltipConfig();
    const metric = payload[0]?.payload?.metric;

    return (
      <div style={tooltipConfig.contentStyle}>
        <p style={tooltipConfig.labelStyle}>{metric}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ ...tooltipConfig.itemStyle, color: entry.color }}>
            {entry.name}: {formatScore(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  // Custom legend formatter
  const renderLegend = (props: any) => {
    if (!showLegend) {
      return null;
    }

    const { payload } = props;

    return (
      <ul className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => (
          <li
            key={`legend-${index}`}
            className="flex items-center gap-2 text-sm"
          >
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-700 dark:text-gray-300">
              {entry.value}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <ChartContainer
      title={title}
      description={description}
      height={height}
      loading={loading}
      error={error}
      className={className}
    >
      <RadarChart
        cx="50%"
        cy="50%"
        outerRadius={height * 0.35}
        data={chartData}
      >
        {/* Grid lines */}
        <PolarGrid stroke="#e5e7eb" strokeOpacity={0.5} />

        {/* Metric labels around the perimeter */}
        <PolarAngleAxis
          dataKey="metric"
          tick={{ fill: '#6b7280', fontSize: 12 }}
        />

        {/* Score scale (0-100) */}
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: '#6b7280', fontSize: 10 }}
        />

        {/* Tooltip */}
        <Tooltip content={<CustomTooltip />} />

        {/* Legend */}
        {showLegend && (
          <Legend
            content={renderLegend}
            iconType={LEGEND_CONFIG.iconType}
            iconSize={LEGEND_CONFIG.iconSize}
            wrapperStyle={LEGEND_CONFIG.wrapperStyle}
          />
        )}

        {/* Radar areas for each entity */}
        {data.map((entity, index) => (
          <Radar
            key={entity.entityId}
            name={entity.entityName}
            dataKey={entity.entityName}
            stroke={getChartColor(index)}
            fill={getChartColor(index)}
            fillOpacity={0.3}
            strokeWidth={2}
          />
        ))}
      </RadarChart>
    </ChartContainer>
  );
};
