/**
 * Table Components Style Consistency Test
 * 
 * Verifies that DataTable, NodeDetailsTable, and VirtualTable
 * use unified design system styles as per task 4.4
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DataTable } from '../DataTable';
import { NodeDetailsTable } from '../NodeDetailsTable';
import { VirtualTable } from '../VirtualTable';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';

describe('Table Components Style Consistency', () => {
  describe('DataTable', () => {
    it('applies unified border and background colors', () => {
      const { container } = render(
        <DataTable
          data={[{ id: 1, name: 'Test' }]}
          columns={[{ key: 'name', label: 'Name' }]}
          keyField="id"
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('bg-white');
      expect(wrapper).toHaveClass('dark:bg-zinc-900');
      expect(wrapper).toHaveClass('border-gray-200');
      expect(wrapper).toHaveClass('dark:border-zinc-800');
      expect(wrapper).toHaveClass('rounded-xl');
      expect(wrapper).toHaveClass('shadow-md');
    });

    it('applies custom-scrollbar utility class', () => {
      const { container } = render(
        <DataTable
          data={[{ id: 1, name: 'Test' }]}
          columns={[{ key: 'name', label: 'Name' }]}
          keyField="id"
        />
      );

      const scrollContainer = container.querySelector('.custom-scrollbar');
      expect(scrollContainer).toBeTruthy();
    });

    it('uses text-xs for table headers', () => {
      const { container } = render(
        <DataTable
          data={[{ id: 1, name: 'Test' }]}
          columns={[{ key: 'name', label: 'Name' }]}
          keyField="id"
        />
      );

      const header = container.querySelector('th');
      expect(header).toHaveClass('text-xs');
      expect(header).toHaveClass('font-semibold');
      expect(header).toHaveClass('text-gray-600');
      expect(header).toHaveClass('dark:text-zinc-400');
    });

    it('uses unified row hover states', () => {
      const { container } = render(
        <DataTable
          data={[{ id: 1, name: 'Test' }]}
          columns={[{ key: 'name', label: 'Name' }]}
          keyField="id"
        />
      );

      const row = container.querySelector('tbody tr');
      expect(row).toHaveClass('hover:bg-gray-50');
      expect(row).toHaveClass('dark:hover:bg-zinc-800/50');
      expect(row).toHaveClass('transition-colors');
      expect(row).toHaveClass('duration-200');
    });
  });

  describe('NodeDetailsTable', () => {
    const mockNodes = [
      {
        nodeId: 'node1',
        nodeName: 'Test Node',
        protocol: 'vmess',
        region: 'US',
        latency: { min: 10, p50: 20, p90: 30, p95: 35, p99: 40, max: 50, mean: 25, stdDev: 5 },
        availability: { rate: 99.5, totalChecks: 100, successfulChecks: 99 },
        stability: { score: 95, maxConsecutiveFailures: 1 },
        jitter: { absoluteJitter: 5, relativeJitter: 0.2, maxDeviation: 10, dataPoints: 100, insufficient: false },
        healthStatus: 'excellent' as const,
        qualityScore: { overall: 95, availability: 99, latency: 90, stability: 95 }
      }
    ];

    it('applies unified border and background colors', () => {
      const { container } = render(
        <I18nextProvider i18n={i18n}>
          <NodeDetailsTable nodes={mockNodes} />
        </I18nextProvider>
      );

      const wrapper = container.querySelector('.bg-white');
      expect(wrapper).toHaveClass('bg-white');
      expect(wrapper).toHaveClass('dark:bg-zinc-900');
      expect(wrapper).toHaveClass('border-gray-200');
      expect(wrapper).toHaveClass('dark:border-zinc-800');
      expect(wrapper).toHaveClass('rounded-xl');
      expect(wrapper).toHaveClass('shadow-md');
    });

    it('applies custom-scrollbar utility class', () => {
      const { container } = render(
        <I18nextProvider i18n={i18n}>
          <NodeDetailsTable nodes={mockNodes} />
        </I18nextProvider>
      );

      const scrollContainer = container.querySelector('.custom-scrollbar');
      expect(scrollContainer).toBeTruthy();
    });

    it('uses text-xs for table headers', () => {
      const { container } = render(
        <I18nextProvider i18n={i18n}>
          <NodeDetailsTable nodes={mockNodes} />
        </I18nextProvider>
      );

      const header = container.querySelector('th');
      expect(header).toHaveClass('text-xs');
      expect(header).toHaveClass('font-semibold');
      expect(header).toHaveClass('text-gray-600');
      expect(header).toHaveClass('dark:text-zinc-400');
    });

    it('uses unified row hover states', () => {
      const { container } = render(
        <I18nextProvider i18n={i18n}>
          <NodeDetailsTable nodes={mockNodes} />
        </I18nextProvider>
      );

      const row = container.querySelector('tbody tr');
      expect(row).toHaveClass('hover:bg-gray-50');
      expect(row).toHaveClass('dark:hover:bg-zinc-800/50');
      expect(row).toHaveClass('transition-colors');
      expect(row).toHaveClass('duration-200');
    });
  });

  describe('VirtualTable', () => {
    it('applies unified border and background colors', () => {
      const { container } = render(
        <VirtualTable
          data={[{ id: 1, name: 'Test' }]}
          columns={[{ key: 'name', label: 'Name' }]}
          keyField="id"
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('bg-white');
      expect(wrapper).toHaveClass('dark:bg-zinc-900');
      expect(wrapper).toHaveClass('border-gray-200');
      expect(wrapper).toHaveClass('dark:border-zinc-800');
      expect(wrapper).toHaveClass('rounded-xl');
      expect(wrapper).toHaveClass('shadow-md');
    });

    it('applies custom-scrollbar utility class', () => {
      const { container } = render(
        <VirtualTable
          data={[{ id: 1, name: 'Test' }]}
          columns={[{ key: 'name', label: 'Name' }]}
          keyField="id"
        />
      );

      const scrollContainer = container.querySelector('.custom-scrollbar');
      expect(scrollContainer).toBeTruthy();
    });

    it('uses text-xs for table headers', () => {
      const { container } = render(
        <VirtualTable
          data={[{ id: 1, name: 'Test' }]}
          columns={[{ key: 'name', label: 'Name' }]}
          keyField="id"
        />
      );

      const header = container.querySelector('th');
      expect(header).toHaveClass('text-xs');
      expect(header).toHaveClass('font-semibold');
      expect(header).toHaveClass('text-gray-600');
      expect(header).toHaveClass('dark:text-zinc-400');
    });

    it('uses unified row hover states', () => {
      const { container } = render(
        <VirtualTable
          data={[{ id: 1, name: 'Test' }]}
          columns={[{ key: 'name', label: 'Name' }]}
          keyField="id"
        />
      );

      const row = container.querySelector('tbody tr');
      expect(row).toHaveClass('hover:bg-gray-50');
      expect(row).toHaveClass('dark:hover:bg-zinc-800/50');
      expect(row).toHaveClass('transition-colors');
      expect(row).toHaveClass('duration-200');
    });
  });
});
