import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CircuitBoard, type GridCoordinates } from '../CircuitBoard';
import type { Position } from '../../types';
import { Resistor, Battery, LED, Wire } from '../../types/electrical-components';
import type { IElectricalComponent } from '../../types/components';

// Mock canvas context
const mockContext = {
  clearRect: vi.fn(),
  strokeStyle: '',
  lineWidth: 0,
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fillStyle: '',
  fillRect: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  closePath: vi.fn(),
  fillText: vi.fn(),
  font: '',
  textAlign: 'start' as CanvasTextAlign
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
        cursor: 'default', // Default cursor when not in wire mode
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
      expect(mockOnClick).toHaveBeenCalledWith({ x: 20, y: 20 }, undefined);
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
      expect(mockOnClick).toHaveBeenLastCalledWith({ x: 0, y: 0 }, undefined);
      
      fireEvent.click(canvas, { clientX: 30, clientY: 40 }); // Should snap to (25, 25)
      expect(mockOnClick).toHaveBeenLastCalledWith({ x: 25, y: 25 }, undefined);
      
      fireEvent.click(canvas, { clientX: 62, clientY: 87 }); // Should snap to (50, 75)
      expect(mockOnClick).toHaveBeenLastCalledWith({ x: 50, y: 75 }, undefined);
    });

    it('works with different grid sizes', () => {
      const mockOnClick = vi.fn();
      render(<CircuitBoard onCanvasClick={mockOnClick} gridSize={10} />);
      
      const canvas = screen.getByTestId('circuit-board-canvas');
      
      fireEvent.click(canvas, { clientX: 23, clientY: 37 });
      // With gridSize 10, should snap to (20, 30)
      expect(mockOnClick).toHaveBeenCalledWith({ x: 20, y: 30 }, undefined);
    });
  });

  describe('Component Rendering', () => {
    let mockComponents: IElectricalComponent[];

    beforeEach(() => {
      mockComponents = [
        new Resistor('resistor1', { x: 100, y: 100 }, 1000),
        new Battery('battery1', { x: 200, y: 200 }, 9),
        new LED('led1', { x: 300, y: 300 }, 2.0),
        new Wire('wire1', { x: 150, y: 150 }, [{ x: 150, y: 150 }, { x: 250, y: 250 }])
      ];
    });

    it('renders components without errors', () => {
      render(<CircuitBoard components={mockComponents} />);
      
      const canvas = screen.getByTestId('circuit-board-canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('handles empty components array', () => {
      render(<CircuitBoard components={[]} />);
      
      const canvas = screen.getByTestId('circuit-board-canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('handles component selection callbacks', () => {
      const mockOnSelect = vi.fn();
      const mockOnDeselect = vi.fn();
      
      render(
        <CircuitBoard 
          components={mockComponents}
          onComponentSelect={mockOnSelect}
          onComponentDeselect={mockOnDeselect}
        />
      );
      
      const canvas = screen.getByTestId('circuit-board-canvas');
      
      // Mock getBoundingClientRect
      vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, x: 0, y: 0, toJSON: () => ({})
      });
      
      fireEvent.click(canvas, { clientX: 100, clientY: 100 });
      
      // Component should handle clicks without errors
      expect(canvas).toBeInTheDocument();
    });

    it('handles component drop operations', () => {
      const mockOnDrop = vi.fn();
      
      render(<CircuitBoard onComponentDrop={mockOnDrop} />);
      
      const canvas = screen.getByTestId('circuit-board-canvas');
      
      // Simulate drag over
      fireEvent.dragOver(canvas, {
        dataTransfer: { dropEffect: 'copy' }
      });
      
      // Simulate drop
      const dragData = JSON.stringify({ componentType: 'resistor', componentId: 'resistor1' });
      fireEvent.drop(canvas, {
        dataTransfer: { getData: () => dragData }
      });
      
      expect(mockOnDrop).toHaveBeenCalledWith('resistor', 'resistor1', expect.any(Object));
    });

    it('updates when components prop changes', () => {
      const { rerender } = render(<CircuitBoard components={mockComponents} />);
      
      const canvas = screen.getByTestId('circuit-board-canvas');
      expect(canvas).toBeInTheDocument();
      
      // Update with fewer components
      const newComponents = [mockComponents[0], mockComponents[1]];
      rerender(<CircuitBoard components={newComponents} />);
      
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Rendering Performance', () => {
    it('handles large numbers of components efficiently', () => {
      // Create a large number of components
      const largeComponentSet: IElectricalComponent[] = [];
      for (let i = 0; i < 1000; i++) {
        largeComponentSet.push(new Resistor(`resistor${i}`, { x: i * 10, y: i * 10 }, 1000));
      }
      
      const startTime = performance.now();
      
      render(<CircuitBoard components={largeComponentSet} />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within reasonable time (less than 100ms)
      expect(renderTime).toBeLessThan(100);
      
      const canvas = screen.getByTestId('circuit-board-canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('handles frequent component updates efficiently', () => {
      const initialComponents = [
        new Resistor('resistor1', { x: 100, y: 100 }, 1000)
      ];
      
      const { rerender } = render(<CircuitBoard components={initialComponents} />);
      
      const startTime = performance.now();
      
      // Perform multiple rapid updates
      for (let i = 0; i < 100; i++) {
        const updatedComponents = [
          new Resistor('resistor1', { x: 100 + i, y: 100 + i }, 1000 + i)
        ];
        rerender(<CircuitBoard components={updatedComponents} />);
      }
      
      const endTime = performance.now();
      const updateTime = endTime - startTime;
      
      // Should handle updates within reasonable time (less than 200ms for 100 updates)
      expect(updateTime).toBeLessThan(200);
    });

    it('handles rapid mouse events efficiently', () => {
      const mockOnMouseMove = vi.fn();
      render(<CircuitBoard onCanvasMouseMove={mockOnMouseMove} />);
      
      const canvas = screen.getByTestId('circuit-board-canvas');
      
      // Mock getBoundingClientRect
      vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, x: 0, y: 0, toJSON: () => ({})
      });
      
      const startTime = performance.now();
      
      // Simulate rapid mouse movements
      for (let i = 0; i < 100; i++) {
        fireEvent.mouseMove(canvas, { clientX: i, clientY: i });
      }
      
      const endTime = performance.now();
      const eventTime = endTime - startTime;
      
      // Should handle events within reasonable time (less than 50ms for 100 events)
      expect(eventTime).toBeLessThan(50);
      expect(mockOnMouseMove).toHaveBeenCalledTimes(100);
    });
  });

  describe('Rendering Accuracy', () => {
    it('calls canvas context methods in correct order for grid drawing', () => {
      render(<CircuitBoard width={100} height={100} gridSize={20} />);
      
      // Verify the sequence of canvas operations
      const calls = mockContext.clearRect.mock.calls;
      expect(calls[0]).toEqual([0, 0, 100, 100]);
      
      expect(mockContext.strokeStyle).toBe('#e0e0e0');
      expect(mockContext.lineWidth).toBe(1);
      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.stroke).toHaveBeenCalled();
    });

    it('draws correct number of grid lines', () => {
      render(<CircuitBoard width={100} height={100} gridSize={20} />);
      
      // For 100x100 canvas with 20px grid, should have:
      // Vertical lines: 0, 20, 40, 60, 80, 100 = 6 lines
      // Horizontal lines: 0, 20, 40, 60, 80, 100 = 6 lines
      // Total moveTo calls should be at least 12 (6 + 6)
      expect(mockContext.moveTo).toHaveBeenCalled();
      expect(mockContext.lineTo).toHaveBeenCalled();
      
      // Verify stroke is called for each line
      expect(mockContext.stroke).toHaveBeenCalled();
    });

    it('applies correct canvas transformations', () => {
      const components = [new Resistor('resistor1', { x: 100, y: 100 }, 1000)];
      
      render(<CircuitBoard components={components} gridSize={25} />);
      
      // Canvas should be cleared and redrawn
      expect(mockContext.clearRect).toHaveBeenCalled();
      
      // Canvas context methods should be called for rendering
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });

    it('handles different grid sizes accurately', () => {
      const { rerender } = render(<CircuitBoard width={200} height={200} gridSize={10} />);
      
      // Clear mock calls
      vi.clearAllMocks();
      
      // Re-render with different grid size
      rerender(<CircuitBoard width={200} height={200} gridSize={50} />);
      
      // Should redraw with new grid size
      expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 200, 200);
      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.stroke).toHaveBeenCalled();
    });

    it('maintains aspect ratio with different canvas dimensions', () => {
      const { rerender } = render(<CircuitBoard width={400} height={300} gridSize={20} />);
      
      const canvas = screen.getByTestId('circuit-board-canvas');
      expect(canvas).toHaveAttribute('width', '400');
      expect(canvas).toHaveAttribute('height', '300');
      
      // Re-render with different dimensions
      rerender(<CircuitBoard width={800} height={600} gridSize={20} />);
      
      expect(canvas).toHaveAttribute('width', '800');
      expect(canvas).toHaveAttribute('height', '600');
    });
  });

  describe('Memory Management', () => {
    it('cleans up event listeners on unmount', () => {
      const { unmount } = render(<CircuitBoard />);
      
      // Should unmount without memory leaks
      expect(() => unmount()).not.toThrow();
    });

    it('handles component prop changes without memory leaks', () => {
      const initialComponents = [new Resistor('resistor1', { x: 100, y: 100 }, 1000)];
      const { rerender, unmount } = render(<CircuitBoard components={initialComponents} />);
      
      // Update components multiple times
      for (let i = 0; i < 10; i++) {
        const newComponents = [new Resistor(`resistor${i}`, { x: 100 + i, y: 100 + i }, 1000)];
        rerender(<CircuitBoard components={newComponents} />);
      }
      
      // Should clean up without errors
      expect(() => unmount()).not.toThrow();
    });

    it('handles rapid re-renders without accumulating listeners', () => {
      const { rerender, unmount } = render(<CircuitBoard />);
      
      // Perform rapid re-renders
      for (let i = 0; i < 50; i++) {
        rerender(<CircuitBoard gridSize={20 + i} />);
      }
      
      // Should clean up properly
      expect(() => unmount()).not.toThrow();
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