/**
 * Chart configuration utility tests
 */

import { describe, it, expect } from 'vitest';
import {
  getHealthColor,
  getChartColor,
  formatLatency,
  formatAvailability,
  formatScore,
  getResponsiveHeight,
  HEALTH_COLORS,
  CHART_COLORS,
  CHART_HEIGHTS,
  BREAKPOINTS
} from './chartConfig';

describe('chartConfig utilities', () => {
  describe('getHealthColor', () => {
    it('returns correct color for excellent status', () => {
      expect(getHealthColor('excellent')).toBe(HEALTH_COLORS.excellent);
      expect(getHealthColor('Excellent')).toBe(HEALTH_COLORS.excellent);
      expect(getHealthColor('EXCELLENT')).toBe(HEALTH_COLORS.excellent);
    });

    it('returns correct color for good status', () => {
      expect(getHealthColor('good')).toBe(HEALTH_COLORS.good);
    });

    it('returns correct color for fair status', () => {
      expect(getHealthColor('fair')).toBe(HEALTH_COLORS.fair);
    });

    it('returns correct color for offline status', () => {
      expect(getHealthColor('offline')).toBe(HEALTH_COLORS.offline);
    });

    it('returns unknown color for invalid status', () => {
      expect(getHealthColor('invalid')).toBe(HEALTH_COLORS.unknown);
      expect(getHealthColor('')).toBe(HEALTH_COLORS.unknown);
    });
  });

  describe('getChartColor', () => {
    it('returns colors in sequence', () => {
      const colors = Object.values(CHART_COLORS);
      expect(getChartColor(0)).toBe(colors[0]);
      expect(getChartColor(1)).toBe(colors[1]);
      expect(getChartColor(2)).toBe(colors[2]);
    });

    it('cycles through colors when index exceeds array length', () => {
      const colors = Object.values(CHART_COLORS);
      const colorCount = colors.length;
      expect(getChartColor(colorCount)).toBe(colors[0]);
      expect(getChartColor(colorCount + 1)).toBe(colors[1]);
    });
  });

  describe('formatLatency', () => {
    it('formats latency values correctly', () => {
      expect(formatLatency(123.456)).toBe('123ms');
      expect(formatLatency(100)).toBe('100ms');
      expect(formatLatency(0)).toBe('0ms');
    });

    it('rounds to nearest integer', () => {
      expect(formatLatency(123.4)).toBe('123ms');
      expect(formatLatency(123.5)).toBe('124ms');
      expect(formatLatency(123.9)).toBe('124ms');
    });
  });

  describe('formatAvailability', () => {
    it('formats availability percentages correctly', () => {
      expect(formatAvailability(98.765)).toBe('98.8%');
      expect(formatAvailability(100)).toBe('100.0%');
      expect(formatAvailability(0)).toBe('0.0%');
    });

    it('rounds to one decimal place', () => {
      expect(formatAvailability(98.74)).toBe('98.7%');
      expect(formatAvailability(98.75)).toBe('98.8%');
    });
  });

  describe('formatScore', () => {
    it('formats scores correctly', () => {
      expect(formatScore(87.654)).toBe('87.7');
      expect(formatScore(100)).toBe('100.0');
      expect(formatScore(0)).toBe('0.0');
    });

    it('rounds to one decimal place', () => {
      expect(formatScore(87.64)).toBe('87.6');
      expect(formatScore(87.65)).toBe('87.7');
    });
  });

  describe('getResponsiveHeight', () => {
    it('returns small height for mobile screens', () => {
      expect(getResponsiveHeight(500)).toBe(CHART_HEIGHTS.small);
      expect(getResponsiveHeight(BREAKPOINTS.mobile - 1)).toBe(CHART_HEIGHTS.small);
    });

    it('returns medium height for tablet screens', () => {
      expect(getResponsiveHeight(BREAKPOINTS.mobile)).toBe(CHART_HEIGHTS.medium);
      expect(getResponsiveHeight(900)).toBe(CHART_HEIGHTS.medium);
      expect(getResponsiveHeight(BREAKPOINTS.tablet - 1)).toBe(CHART_HEIGHTS.medium);
    });

    it('returns large height for desktop screens', () => {
      expect(getResponsiveHeight(BREAKPOINTS.tablet)).toBe(CHART_HEIGHTS.large);
      expect(getResponsiveHeight(1500)).toBe(CHART_HEIGHTS.large);
    });
  });
});
