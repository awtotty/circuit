# Circuit Learning Game Design Document

## Overview

The Circuit Learning Game is a web-based educational platform that teaches high school students electrical circuit concepts through interactive simulation and gamified learning. The system combines a visual circuit builder, real-time physics simulation, progressive curriculum, and comprehensive progress tracking to create an engaging learning experience.

## Architecture

### System Architecture
The application follows a modern web architecture with clear separation of concerns:

- **Frontend**: React-based single-page application with Canvas/WebGL for circuit visualization
- **Backend**: Node.js/Express API server for user management, progress tracking, and content delivery
- **Database**: PostgreSQL for user data, progress tracking, and curriculum content
- **Circuit Engine**: Custom JavaScript physics engine for electrical circuit simulation
- **Content Management**: JSON-based curriculum structure with dynamic loading

### Technology Stack
- **Frontend**: React 18, TypeScript, HTML5 Canvas, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based authentication
- **Real-time Features**: WebSocket connections for multiplayer features (future)
- **Testing**: Vitest for unit tests, Cypress for E2E testing

## Components and Interfaces

### Core Components

#### 1. Circuit Builder Component
- **Purpose**: Visual drag-and-drop interface for building circuits
- **Key Features**:
  - Component palette with electrical components (resistors, capacitors, batteries, LEDs, switches)
  - Grid-based workspace for precise component placement
  - Wire connection system with snap-to-grid functionality
  - Component property editor (resistance values, voltage ratings)
- **Interfaces**:
  - `IComponent`: Base interface for all electrical components
  - `IConnection`: Interface for wire connections between components
  - `ICircuitBoard`: Interface for the main workspace

#### 2. Circuit Simulation Engine
- **Purpose**: Real-time electrical simulation using Kirchhoff's laws
- **Key Features**:
  - Nodal analysis for complex circuits
  - Real-time current, voltage, and power calculations
  - Component behavior simulation (LED brightness, motor speed)
  - Error detection (short circuits, open circuits)
- **Interfaces**:
  - `ISimulationEngine`: Main simulation interface
  - `IElectricalNode`: Interface for circuit nodes
  - `ISimulationResult`: Interface for simulation output data

#### 3. Learning Management System
- **Purpose**: Curriculum delivery and progress tracking
- **Key Features**:
  - Lesson progression with prerequisites
  - Interactive tutorials and hints
  - Achievement and badge system
  - Adaptive difficulty adjustment
- **Interfaces**:
  - `ILesson`: Interface for individual lessons
  - `IProgress`: Interface for tracking student progress
  - `IAchievement`: Interface for badges and achievements

#### 4. Feedback System
- **Purpose**: Immediate educational feedback and guidance
- **Key Features**:
  - Context-aware hints and tips
  - Error explanation with visual highlights
  - Success celebrations and explanations
  - Adaptive help based on student performance
- **Interfaces**:
  - `IFeedbackProvider`: Interface for generating contextual feedback
  - `IHintSystem`: Interface for progressive hint delivery

#### 5. Teacher Dashboard
- **Purpose**: Classroom management and student monitoring
- **Key Features**:
  - Student progress overview
  - Performance analytics and reports
  - Custom assignment creation
  - Struggling student identification
- **Interfaces**:
  - `ITeacherDashboard`: Main dashboard interface
  - `IStudentAnalytics`: Interface for student performance data
  - `IAssignment`: Interface for custom assignments

## Data Models

### User Models
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'teacher';
  createdAt: Date;
  lastLoginAt: Date;
}

interface StudentProfile extends User {
  grade: number;
  currentLesson: string;
  totalPoints: number;
  achievements: Achievement[];
  preferences: StudentPreferences;
}

interface TeacherProfile extends User {
  classrooms: Classroom[];
  assignedStudents: string[];
}
```

### Circuit Models
```typescript
interface Circuit {
  id: string;
  name: string;
  components: Component[];
  connections: Connection[];
  metadata: CircuitMetadata;
}

interface Component {
  id: string;
  type: ComponentType;
  position: Position;
  properties: ComponentProperties;
  connections: string[];
}

interface Connection {
  id: string;
  fromComponent: string;
  toComponent: string;
  fromTerminal: string;
  toTerminal: string;
}
```

### Learning Models
```typescript
interface Lesson {
  id: string;
  title: string;
  description: string;
  objectives: string[];
  prerequisites: string[];
  content: LessonContent;
  challenges: Challenge[];
  estimatedTime: number;
}

interface Progress {
  userId: string;
  lessonId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  score: number;
  timeSpent: number;
  attempts: number;
  lastAccessed: Date;
}
```

## Error Handling

### Circuit Simulation Errors
- **Short Circuit Detection**: Identify and highlight dangerous short circuits
- **Open Circuit Handling**: Detect incomplete circuits and guide students
- **Component Overload**: Warn when components exceed safe operating limits
- **Invalid Connections**: Prevent impossible electrical connections

### User Experience Errors
- **Network Connectivity**: Graceful offline mode with local storage
- **Browser Compatibility**: Fallback rendering for older browsers
- **Performance Issues**: Circuit complexity limits and optimization warnings
- **Data Loss Prevention**: Auto-save functionality with recovery options

### Educational Errors
- **Misconception Detection**: Identify common student mistakes and provide targeted feedback
- **Difficulty Adjustment**: Automatically adjust challenge difficulty based on performance
- **Engagement Monitoring**: Detect when students are struggling and offer additional support

## Testing Strategy

### Unit Testing
- **Component Testing**: Individual React component testing with Jest and React Testing Library
- **Simulation Engine**: Comprehensive testing of electrical calculations and circuit analysis
- **API Endpoints**: Backend API testing with supertest
- **Utility Functions**: Pure function testing for mathematical calculations

### Integration Testing
- **Circuit Builder Integration**: End-to-end testing of drag-and-drop functionality
- **Simulation Integration**: Testing circuit building to simulation pipeline
- **Progress Tracking**: Testing lesson completion and progress updates
- **Authentication Flow**: User registration, login, and session management

### Educational Testing
- **Learning Effectiveness**: A/B testing of different teaching approaches
- **User Experience**: Usability testing with actual high school students
- **Performance Testing**: Load testing with multiple concurrent users
- **Accessibility Testing**: Ensuring compliance with WCAG guidelines

### Automated Testing Pipeline
- **Continuous Integration**: GitHub Actions for automated testing on pull requests
- **Visual Regression Testing**: Automated screenshot comparison for UI consistency
- **Performance Monitoring**: Automated performance benchmarking
- **Security Testing**: Automated vulnerability scanning and dependency checking

## Performance Considerations

### Circuit Simulation Optimization
- **Efficient Algorithms**: Optimized nodal analysis for large circuits
- **Caching Strategy**: Memoization of simulation results for repeated calculations
- **Progressive Rendering**: Render circuit updates incrementally
- **Web Workers**: Offload heavy calculations to background threads

### User Experience Optimization
- **Lazy Loading**: Load lesson content and assets on demand
- **Image Optimization**: Compressed component sprites and animations
- **Code Splitting**: Bundle splitting for faster initial load times
- **CDN Integration**: Static asset delivery through content delivery network

## Security Considerations

### Data Protection
- **User Privacy**: COPPA compliance for students under 13
- **Data Encryption**: Encrypted storage of sensitive user information
- **Secure Authentication**: JWT tokens with proper expiration and refresh
- **Input Validation**: Comprehensive validation of all user inputs

### Educational Data Security
- **FERPA Compliance**: Protection of educational records
- **Minimal Data Collection**: Only collect necessary educational data
- **Data Retention Policies**: Clear policies for data storage and deletion
- **Audit Logging**: Comprehensive logging of user actions for security monitoring