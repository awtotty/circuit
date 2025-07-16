# Circuit Learning Game

An interactive educational game designed to teach high school students fundamental concepts of electrical circuits through hands-on simulation and gamified learning experiences.

## Development Setup

### Prerequisites
- Node.js (v18 or higher)
- npm

### Installation
```bash
npm install
```

### Development Scripts
```bash
# Start development server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/     # React components
├── services/       # Business logic and API services
├── utilities/      # Utility functions
├── types/          # TypeScript type definitions
├── hooks/          # Custom React hooks
├── constants/      # Application constants
└── test/           # Test setup and utilities
```

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint + Prettier
- **Styling**: CSS (to be enhanced with Tailwind CSS)