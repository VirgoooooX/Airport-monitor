# QualityBadge Component

A reusable React component for displaying quality scores with visual indicators.

## Features

- **Color-coded grade badges**: S/A (green), B/C (yellow), D/F (red)
- **Numerical score display**: Shows score with one decimal place (0-100)
- **Localized descriptions**: Supports multiple languages via i18n
- **Size variants**: Small, medium, and large sizes
- **Accessibility**: Includes ARIA labels and semantic HTML
- **Dark mode support**: Adapts to light and dark themes

## Usage

### Basic Usage

```tsx
import QualityBadge from './components/QualityBadge';

function MyComponent() {
  return (
    <QualityBadge 
      score={87.5} 
      grade="A" 
    />
  );
}
```

### With Custom Description

```tsx
<QualityBadge 
  score={92.3} 
  grade="S" 
  description="Outstanding Performance"
/>
```

### Different Sizes

```tsx
{/* Small */}
<QualityBadge score={75} grade="B" size="sm" />

{/* Medium (default) */}
<QualityBadge score={75} grade="B" size="md" />

{/* Large */}
<QualityBadge score={75} grade="B" size="lg" />
```

### Hide Score or Description

```tsx
{/* Show only grade badge */}
<QualityBadge 
  score={85} 
  grade="A" 
  showScore={false}
  showDescription={false}
/>

{/* Show grade and score only */}
<QualityBadge 
  score={85} 
  grade="A" 
  showDescription={false}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `score` | `number` | Required | Quality score (0-100) |
| `grade` | `'S' \| 'A' \| 'B' \| 'C' \| 'D' \| 'F'` | Required | Quality grade letter |
| `description` | `string` | `undefined` | Custom description (overrides i18n) |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size variant |
| `showScore` | `boolean` | `true` | Show numerical score |
| `showDescription` | `boolean` | `true` | Show description text |

## Color Coding

The component follows a consistent color scheme:

- **S/A grades**: Green (emerald) - Excellent/Good quality
- **B/C grades**: Yellow (amber) - Fair/Acceptable quality  
- **D/F grades**: Red (rose) - Poor/Very Poor quality

## Localization

The component uses i18n for descriptions. Translation keys:

```json
{
  "reports.quality.grades": {
    "S": "Excellent",
    "A": "Good",
    "B": "Fair",
    "C": "Acceptable",
    "D": "Poor",
    "F": "Very Poor"
  }
}
```

Chinese translations:

```json
{
  "reports.quality.grades": {
    "S": "优秀",
    "A": "良好",
    "B": "中等",
    "C": "及格",
    "D": "较差",
    "F": "很差"
  }
}
```

## Accessibility

- Uses `role="status"` for screen readers
- Includes descriptive `aria-label` with grade, score, and description
- Visual elements marked with `aria-hidden="true"`
- Keyboard accessible when used in interactive contexts

## Examples

### Airport Quality Display

```tsx
function AirportCard({ airport }) {
  return (
    <div className="card">
      <h3>{airport.name}</h3>
      <QualityBadge 
        score={airport.qualityScore} 
        grade={airport.qualityGrade}
      />
    </div>
  );
}
```

### Node Quality Display

```tsx
function NodeDetails({ node }) {
  return (
    <div>
      <h4>{node.name}</h4>
      <div className="metrics">
        <span>Quality:</span>
        <QualityBadge 
          score={node.qualityScore} 
          grade={node.qualityGrade}
          size="sm"
        />
      </div>
    </div>
  );
}
```

### Quality Score Table

```tsx
function QualityTable({ airports }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Airport</th>
          <th>Quality</th>
        </tr>
      </thead>
      <tbody>
        {airports.map(airport => (
          <tr key={airport.id}>
            <td>{airport.name}</td>
            <td>
              <QualityBadge 
                score={airport.qualityScore} 
                grade={airport.qualityGrade}
                showDescription={false}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

## Requirements Mapping

This component satisfies the following requirements:

- **11.1**: Renders quality score as numerical value
- **11.2**: Renders quality grade as letter badge
- **11.3**: Renders quality description in user's selected language
- **11.5**: Uses visual indicators (colors, badges) for quality grades
- **11.6**: Green/positive style for S/A grades
- **11.7**: Yellow/neutral style for B/C grades
- **11.8**: Red/negative style for D/F grades

## Testing

The component includes comprehensive tests covering:

- Grade display for all letters (S, A, B, C, D, F)
- Score display with proper rounding
- Color coding for each grade
- Localization in English and Chinese
- Size variants
- Accessibility features
- Edge cases (0, 100, decimals)

Run tests:

```bash
npm test -- QualityBadge.test.tsx
```
