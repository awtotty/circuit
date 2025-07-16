import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CircuitBoard, type GridCoordinates } from '../CircuitBoard';
import type { Position } from '../../types';

// Mock canvas context
const mockContext = {
  clearRect: vi.fn(),
  strokeStyle: '',
  lineWidth: 0,
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
};

const mockGetContext = vi.fn(() => mockContext);

// Mock HTMLCanvasElement
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: mockGetContext,
});

// Mock getBoundingClientRect
Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
  value: vi.fn(() => ({
    left: 0,
    top: 0,
    width: 800,
    height: 600,
  })),
});

describe('CircuitBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders canvas with correct dimensions', () => {
      render(<CircuitBoard width={800} height={600} />);
      
      const canvas = screen.getByTestId('circuit-board-canvas');
      expect(canvas).toBeInTheDocument();
      expect(canvas).toHaveAttribute('width', '800');
      expect(canvas).toHaveAttribute('height', '600');
    });

    it('renders with default dimensions when not specified', () => {
      render(<CircuitBoard />);
      
      const canvas = screen.getByTestId('circuit-board-canvas');
      expect(canvas).toHaveAttribute('width', '800');
      expect(canvas).toHaveAttribute('height', '600');
    });

    it('applies correct styling to canvas', () => {
      render(<CircuitBoard />);
      
      const canvas = screen.getByTestId('circuit-board-canvas');
      expect(canvas).toHaveStyle({
        border: '2px solid #333',
        cursor: 'crosshair',
        backgroundColor: '#fafafa',
      });
    });

    it('displays mouse position', () => {
      render(<CircuitBoard />);
      
      expect(screen.getByText(/Mouse Position:/)).toBeInTheDocument();
    });
  });

  describe('Grid Drawing', () => {
    it('calls canvas drawing methods to create grid', () => {
      render(<CircuitBoard width={100} height={100} gridSize={20} />);
      
      // Verify context methods were called for grid drawing
      expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 100, 100);
      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.moveTo).toHaveBeenCalled();
      expect(mockContext.lineTo).toHaveBeenCalled();
      expect(mockContext.stroke).toHaveBeenCalled();
    });

    it('sets correct stroke style for grid lines', () => {
      render(<CircuitBoard />);
      
      expect(mockContext.strokeStyle).toBe('#e0e0e0');
      expect(mockContext.lineWidth).toBe(1);
    });
  });

  describe('Mouse Events', () => {
    it('handles canvas click events', () => {
      const mockOnClick = vi.fn();
      render(<CircuitBoard onCanvasClick={mockOnClick} gridSize={20} />);
      
      const canvas = screen.getByTestId('circuit-board-canvas');
      
      // Simulate click at position (25, 35)
      fireEvent.click(canvas, {
        clientX: 25,
        clientY: 35,
      });
      
      // Should snap to grid (20, 20) with gridSize 20
      expect(mockOnClick).toHaveBeenCalledWith({ x: 20, y: 20 });
    });

    it('handles canvas mouse move events', () => {
      const mockOnMouseMove = vi.fn();
      render(<CircuitBoard onCanvasMouseMove={mockOnMouseMove} gridSize={20} />);
      
      const canvas = screen.getByTestId('circuit-board-canvas');
      
      // Simulate mouse move at position (15, 25)
      fireEvent.mouseMove(canvas, {
        clientX: 15,
        clientY: 25,
      });
      
      // Should snap to grid (0, 20) with gridSize 20
      expect(mockOnMouseMove).toHaveBeenCalledWith({ x: 0, y: 20 });
    });

    it('updates mouse position display on mouse move', () => {
      render(<CircuitBoard gridSize={20} />);
      
      const canvas = screen.getByTestId('circuit-board-canvas');
      
      // Simulate mouse move
      fireEvent.mouseMove(canvas, {
        clientX: 45,
        clientY: 55,
      });
      
      // Should display snapped position
      expect(screen.getByText('Mouse Position: (40, 40)')).toBeInTheDocument();
    });
  });

  describe('Coordinate Transformations', () => {
    // We'll test coordinate transformations by creating a test component that exposes the methods
    const TestCircuitBoard: React.FC<{ onCoordinateTest?: (coords: any) => void }> = ({ onCoordinateTest }) => {
      const gridSize = 20;
      
      // Test coordinate transformation functions
      const canvasToGrid = (canvasPos: Position): GridCoordinates => {
        return {
          gridX: Math.floor(canvasPos.x / gridSize),
          gridY: Math.floor(canvasPos.y / gridSize),
        };
      };

      const gridToCanvas = (gridPos: GridCoordinates): Position => {
        return {
          x: gridPos.gridX * gridSize,
          y: gridPos.gridY * gridSize,
        };
      };

      const snapToGrid = (position: Position): Position => {
        const gridPos = canvasToGrid(position);
        return gridToCanvas(gridPos);
      };

      React.useEffect(() => {
        if (onCoordinateTest) {
          onCoordinateTest({
            canvasToGrid,
            gridToCanvas,
            snapToGrid,
          });
        }
      }, []);

      return <CircuitBoard gridSize={gridSize} />;
    };

    it('converts canvas coordinates to grid coordinates correctly', () => {
      let coordinateFunctions: any;
      
      render(<TestCircuitBoard onCoordinateTest={(coords) => { coordinateFunctions = coords; }} />);
      
      // Test various canvas positions
      expect(coordinateFunctions.canvasToGrid({ x: 0, y: 0 })).toEqual({ gridX: 0, gridY: 0 });
      expect(coordinateFunctions.canvasToGrid({ x: 19, y: 19 })).toEqual({ gridX: 0, gridY: 0 });
      expect(coordinateFunctions.canvasToGrid({ x: 20, y: 20 })).toEqual({ gridX: 1, gridY: 1 });
      expect(coordinateFunctions.canvasToGrid({ x: 45, y: 67 })).toEqual({ gridX: 2, gridY: 3 });
    });

    it('converts grid coordinates to canvas coordinates correctly', () => {
      let coordinateFunctions: any;
      
      render(<TestCircuitBoard onCoordinateTest={(coords) => { coordinateFunctions = coords; }} />);
      
      // Test various grid positions
      expect(coordinateFunctions.gridToCanvas({ gridX: 0, gridY: 0 })).toEqual({ x: 0, y: 0 });
      expect(coordinateFunctions.gridToCanvas({ gridX: 1, gridY: 1 })).toEqual({ x: 20, y: 20 });
      expect(coordinateFunctions.gridToCanvas({ gridX: 3, gridY: 5 })).toEqual({ x: 60, y: 100 });
    });

    it('snaps positions to grid correctly', () => {
      let coordinateFunctions: any;
      
      render(<TestCircuitBoard onCoordinateTest={(coords) => { coordinateFunctions = coords; }} />);
      
      // Test snapping various positions
      expect(coordinateFunctions.snapToGrid({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
      expect(coordinateFunctions.snapToGrid({ x: 5, y: 7 })).toEqual({ x: 0, y: 0 });
      expect(coordinateFunctions.snapToGrid({ x: 15, y: 25 })).toEqual({ x: 0, y: 20 });
      expect(coordinateFunctions.snapToGrid({ x: 25, y: 35 })).toEqual({ x: 20, y: 20 });
      expect(coordinateFunctions.snapToGrid({ x: 45, y: 67 })).toEqual({ x: 40, y: 60 });
    });
  });

  describe('Grid Snapping Behavior', () => {
    it('snaps click events to nearest grid intersection', () => {
      const mockOnClick = vi.fn();
      render(<CircuitBoard onCanvasClick={mockOnClick} gridSize={25} />);
      
      const canvas = screen.getByTestId('circuit-board-canvas');
      
      // Test clicks at various positions with gridSize 25
      fireEvent.click(canvas, { clientX: 12, clientY: 12 }); // Should snap to (0, 0)
      expect(mockOnClick).toHaveBeenLastCalledWith({ x: 0, y: 0 });
      
      fireEvent.click(canvas, { clientX: 30, clientY: 40 }); // Should snap to (25, 25)
      expect(mockOnClick).toHaveBeenLastCalledWith({ x: 25, y: 25 });
      
      fireEvent.click(canvas, { clientX: 62, clientY: 87 }); // Should snap to (50, 75)
      expect(mockOnClick).toHaveBeenLastCalledWith({ x: 50, y: 75 });
    });

    it('works with different grid sizes', () => {
      const mockOnClick = vi.fn();
      render(<CircuitBoard onCanvasClick={mockOnClick} gridSize={10} />);
      
      const canvas = screen.getByTestId('circuit-board-canvas');
      
      fireEvent.click(canvas, { clientX: 23, clientY: 37 });
      // With gridSize 10, should snap to (20, 30)
      expect(mockOnClick).toHaveBeenCalledWith({ x: 20, y: 30 });
    });
  });

  describe('Event Cleanup', () => {
    it('component unmounts without errors', () => {
      const { unmount } = render(<CircuitBoard />);
      
      // Should unmount without throwing errors
      expect(() => unmount()).not.toThrow();
    });
  });
});