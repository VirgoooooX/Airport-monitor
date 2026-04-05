# Theme Context

This directory contains the Theme Context implementation for managing dark/light theme switching.

## Usage

### 1. Wrap your app with ThemeProvider

```tsx
import { ThemeProvider } from './contexts';

function App() {
  return (
    <ThemeProvider>
      {/* Your app components */}
    </ThemeProvider>
  );
}
```

### 2. Use the useTheme hook in components

```tsx
import { useTheme } from './contexts';

function MyComponent() {
  const { theme, setTheme, toggleTheme } = useTheme();

  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={toggleTheme}>Toggle Theme</button>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('light')}>Light</button>
    </div>
  );
}
```

## Features

- **Theme persistence**: Theme preference is saved to localStorage with key `airport-monitor-theme`
- **Default theme**: Defaults to 'dark' theme
- **Document class management**: Automatically updates `document.documentElement` class for Tailwind CSS dark mode
- **Type safety**: Full TypeScript support with exported `Theme` type

## API

### ThemeProvider

Provider component that manages theme state and provides it to child components.

**Props:**
- `children: ReactNode` - Child components to wrap

### useTheme()

Hook to access and control theme state.

**Returns:**
- `theme: Theme` - Current theme ('dark' | 'light')
- `setTheme: (theme: Theme) => void` - Set theme to specific value
- `toggleTheme: () => void` - Toggle between dark and light themes

**Throws:**
- Error if used outside of ThemeProvider

### Theme Type

```typescript
export type Theme = 'dark' | 'light';
```
