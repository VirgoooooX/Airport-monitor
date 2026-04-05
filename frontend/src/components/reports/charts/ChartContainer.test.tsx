/**
 * ChartContainer component tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChartContainer } from './ChartContainer';
import { LineChart, Line } from 'recharts';

describe('ChartContainer', () => {
  it('renders children when not loading and no error', () => {
    const testData = [{ x: 1, y: 10 }, { x: 2, y: 20 }];
    
    render(
      <ChartContainer>
        <LineChart data={testData}>
          <Line dataKey="y" />
        </LineChart>
      </ChartContainer>
    );

    // Chart should be rendered (ResponsiveContainer creates a div)
    expect(document.querySelector('.recharts-responsive-container')).toBeTruthy();
  });

  it('renders title and description when provided', () => {
    render(
      <ChartContainer 
        title="Test Chart" 
        description="Test description"
      >
        <div>Chart content</div>
      </ChartContainer>
    );

    expect(screen.getByText('Test Chart')).toBeTruthy();
    expect(screen.getByText('Test description')).toBeTruthy();
  });

  it('renders loading skeleton when loading is true', () => {
    render(
      <ChartContainer loading={true}>
        <div>Chart content</div>
      </ChartContainer>
    );

    // Loading skeleton should have animate-pulse class
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeTruthy();
  });

  it('renders error message when error is provided', () => {
    render(
      <ChartContainer error="Test error message">
        <div>Chart content</div>
      </ChartContainer>
    );

    expect(screen.getByText('Test error message')).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ChartContainer className="custom-class">
        <div>Chart content</div>
      </ChartContainer>
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('custom-class');
  });

  it('uses custom height', () => {
    const { container } = render(
      <ChartContainer height={500}>
        <div>Chart content</div>
      </ChartContainer>
    );

    const chartDiv = container.querySelector('div[style*="height"]') as HTMLElement;
    expect(chartDiv.style.height).toBe('500px');
  });

  it('prioritizes error over loading state', () => {
    render(
      <ChartContainer loading={true} error="Error message">
        <div>Chart content</div>
      </ChartContainer>
    );

    // Error should be shown, not loading skeleton
    expect(screen.getByText('Error message')).toBeTruthy();
    expect(document.querySelector('.animate-pulse')).toBeFalsy();
  });
});
