/**
 * QualityBadge Component Examples
 * 
 * This file demonstrates various usage patterns for the QualityBadge component.
 * These examples can be used for testing, documentation, or as a reference.
 */

import React from 'react';
import QualityBadge, { type QualityGrade } from './QualityBadge';

/**
 * Example: All Grade Variants
 * Shows all possible grade letters with their corresponding scores
 */
export const AllGradesExample: React.FC = () => {
  const grades: Array<{ grade: QualityGrade; score: number }> = [
    { grade: 'S', score: 95 },
    { grade: 'A', score: 85 },
    { grade: 'B', score: 75 },
    { grade: 'C', score: 65 },
    { grade: 'D', score: 55 },
    { grade: 'F', score: 45 },
  ];

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-lg font-semibold">All Grade Variants</h3>
      <div className="space-y-2">
        {grades.map(({ grade, score }) => (
          <div key={grade} className="flex items-center gap-4">
            <span className="w-20 text-sm text-gray-600">Grade {grade}:</span>
            <QualityBadge score={score} grade={grade} />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Example: Size Variants
 * Shows the same grade in different sizes
 */
export const SizeVariantsExample: React.FC = () => {
  return (
    <div className="space-y-4 p-4">
      <h3 className="text-lg font-semibold">Size Variants</h3>
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <span className="w-20 text-sm text-gray-600">Small:</span>
          <QualityBadge score={87.5} grade="A" size="sm" />
        </div>
        <div className="flex items-center gap-4">
          <span className="w-20 text-sm text-gray-600">Medium:</span>
          <QualityBadge score={87.5} grade="A" size="md" />
        </div>
        <div className="flex items-center gap-4">
          <span className="w-20 text-sm text-gray-600">Large:</span>
          <QualityBadge score={87.5} grade="A" size="lg" />
        </div>
      </div>
    </div>
  );
};

/**
 * Example: Display Options
 * Shows different combinations of showing/hiding score and description
 */
export const DisplayOptionsExample: React.FC = () => {
  return (
    <div className="space-y-4 p-4">
      <h3 className="text-lg font-semibold">Display Options</h3>
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <span className="w-32 text-sm text-gray-600">Full (default):</span>
          <QualityBadge score={87.5} grade="A" />
        </div>
        <div className="flex items-center gap-4">
          <span className="w-32 text-sm text-gray-600">No description:</span>
          <QualityBadge score={87.5} grade="A" showDescription={false} />
        </div>
        <div className="flex items-center gap-4">
          <span className="w-32 text-sm text-gray-600">No score:</span>
          <QualityBadge score={87.5} grade="A" showScore={false} />
        </div>
        <div className="flex items-center gap-4">
          <span className="w-32 text-sm text-gray-600">Badge only:</span>
          <QualityBadge
            score={87.5}
            grade="A"
            showScore={false}
            showDescription={false}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Example: Custom Description
 * Shows how to override the default i18n description
 */
export const CustomDescriptionExample: React.FC = () => {
  return (
    <div className="space-y-4 p-4">
      <h3 className="text-lg font-semibold">Custom Descriptions</h3>
      <div className="space-y-2">
        <QualityBadge
          score={95}
          grade="S"
          description="Outstanding Performance"
        />
        <QualityBadge
          score={85}
          grade="A"
          description="Above Average"
        />
        <QualityBadge
          score={75}
          grade="B"
          description="Meets Expectations"
        />
      </div>
    </div>
  );
};

/**
 * Example: Airport Card Integration
 * Shows how the badge might be used in an airport card
 */
export const AirportCardExample: React.FC = () => {
  const airports = [
    { id: '1', name: 'Premium Airport', qualityScore: 92.5, qualityGrade: 'S' as QualityGrade },
    { id: '2', name: 'Standard Airport', qualityScore: 82.3, qualityGrade: 'A' as QualityGrade },
    { id: '3', name: 'Basic Airport', qualityScore: 71.8, qualityGrade: 'B' as QualityGrade },
  ];

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-lg font-semibold">Airport Card Integration</h3>
      <div className="grid gap-3">
        {airports.map((airport) => (
          <div
            key={airport.id}
            className="glass-card p-4 flex items-center justify-between"
          >
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {airport.name}
              </h4>
              <p className="text-sm text-gray-600 dark:text-zinc-400">
                Quality Assessment
              </p>
            </div>
            <QualityBadge
              score={airport.qualityScore}
              grade={airport.qualityGrade}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Example: Table Integration
 * Shows how the badge might be used in a table
 */
export const TableIntegrationExample: React.FC = () => {
  const nodes = [
    { id: '1', name: 'Node HK-01', qualityScore: 95.2, qualityGrade: 'S' as QualityGrade },
    { id: '2', name: 'Node JP-02', qualityScore: 88.7, qualityGrade: 'A' as QualityGrade },
    { id: '3', name: 'Node US-03', qualityScore: 76.4, qualityGrade: 'B' as QualityGrade },
    { id: '4', name: 'Node EU-04', qualityScore: 63.1, qualityGrade: 'C' as QualityGrade },
  ];

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-lg font-semibold">Table Integration</h3>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-zinc-700">
            <th className="text-left py-2 text-sm font-semibold text-gray-900 dark:text-white">
              Node
            </th>
            <th className="text-right py-2 text-sm font-semibold text-gray-900 dark:text-white">
              Quality
            </th>
          </tr>
        </thead>
        <tbody>
          {nodes.map((node) => (
            <tr
              key={node.id}
              className="border-b border-gray-100 dark:border-zinc-800"
            >
              <td className="py-3 text-sm text-gray-900 dark:text-white">
                {node.name}
              </td>
              <td className="py-3 text-right">
                <div className="flex justify-end">
                  <QualityBadge
                    score={node.qualityScore}
                    grade={node.qualityGrade}
                    size="sm"
                    showDescription={false}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Example: Color Coding Demonstration
 * Shows the color coding scheme clearly
 */
export const ColorCodingExample: React.FC = () => {
  return (
    <div className="space-y-4 p-4">
      <h3 className="text-lg font-semibold">Color Coding Scheme</h3>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
            Green (Excellent/Good)
          </p>
          <div className="space-y-2">
            <QualityBadge score={95} grade="S" />
            <QualityBadge score={85} grade="A" />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
            Yellow (Fair/Acceptable)
          </p>
          <div className="space-y-2">
            <QualityBadge score={75} grade="B" />
            <QualityBadge score={65} grade="C" />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
            Red (Poor/Very Poor)
          </p>
          <div className="space-y-2">
            <QualityBadge score={55} grade="D" />
            <QualityBadge score={45} grade="F" />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * All Examples Component
 * Renders all examples in a single view
 */
export const AllExamples: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 p-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        QualityBadge Component Examples
      </h1>
      
      <AllGradesExample />
      <hr className="border-gray-200 dark:border-zinc-700" />
      
      <SizeVariantsExample />
      <hr className="border-gray-200 dark:border-zinc-700" />
      
      <DisplayOptionsExample />
      <hr className="border-gray-200 dark:border-zinc-700" />
      
      <CustomDescriptionExample />
      <hr className="border-gray-200 dark:border-zinc-700" />
      
      <ColorCodingExample />
      <hr className="border-gray-200 dark:border-zinc-700" />
      
      <AirportCardExample />
      <hr className="border-gray-200 dark:border-zinc-700" />
      
      <TableIntegrationExample />
    </div>
  );
};

export default AllExamples;
