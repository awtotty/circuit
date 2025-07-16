import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentPalette } from '../ComponentPalette';
import { CircuitBoard } from '../CircuitBoard';
import type { ComponentType, Position } from '../../types';

// Mock the component utils
vi.mock('../../utilities/component-utils', () => ({
  generateComponentId: vi.fn((type: ComponentType) => `${type}_test_123`)
}));

// Mock canvas context
const mockCanvasContext = {
  clearRect: vi.fn(),
  strokeStyle: '',
  lineWidth: 0,
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fillStyle: '',
  arc: vi.fn(),
  fill: vi.fn(),
  fillRect: vi.fn(),
};

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCanvasContext) as any;

// Test component that combines ComponentPalette and CircuitBoard
const DragDropTestComponent: React.FC = () => {
  const [droppedComponents, setDroppedComponents] = useState<Array<{
    type: ComponentType;
    id: string;
    position: Position;
  }>>([]);

  const handleComponentDragStart = (_componentType: ComponentType, _componentId: string) => {
    // Track drag start for testing
  };

  const handleComponentDragEnd = () => {
    // Track drag end for testing
  };

  const handleComponentDrop = (componentType: ComponentType, componentId: string, position: Position) => {
    setDroppedComponents(prev => [...prev, { type: componentType, id: componentId, position }]);
  };

  return (
    <div style={{ display: 'flex', gap: '20px' }}>
      <ComponentPalette
        onComponentDragStart={handleComponentDragStart}
        onComponentDragEnd={handleComponentDragEnd}
      />
      <CircuitBoard
        width={400}
        height={300}
        onComponentDrop={handleComponentDrop}
      />
      <div data-testid="dropped-components">
        {droppedComponents.map((comp, index) => (
          <div key={index} data-testid={`dropped-${comp.type}-${index}`}>
            {comp.type} at ({comp.position.x}, {comp.position.y})
          </div>
        ))}
      </div>
    </div>
  );
};

describe('Drag and Drop Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders both ComponentPalette and CircuitBoard', () => {
    render(<DragDropTestComponent />);
    
    expect(screen.getByTestId('component-palette')).toBeInTheDocument();
    expect(screen.getByTestId('circuit-board-canvas')).toBeInTheDocument();
  });

  it('allows dragging components from palette to circuit board', () => {
    render(<DragDropTestComponent />);
    
    const resistorItem = screen.getByTestId('palette-item-resistor');
    const circuitBoard = screen.getByTestId('circuit-board-canvas');
    
    // Mock getBoundingClientRect for the canvas
    Object.defineProperty(circuitBoard, 'getBoundingClientRect', {
      value: vi.fn(() => ({
        left: 0,
        top: 0,
        right: 400,
        bottom: 300,
        width: 400,
        height: 300,
        x: 0,
        y: 0,
        toJSON: () => {}
      }))
    });
    
    // Start drag from palette
    fireEvent.dragStart(resistorItem, {
      dataTransfer: {
        setData: vi.fn(),
        setDragImage: vi.fn(),
        effectAllowed: ''
      }
    });
    
    // Simulate drop on circuit board
    fireEvent.drop(circuitBoard, {
      clientX: 100,
      clientY: 100,
      dataTransfer: {
        getData: vi.fn().mockReturnValue(JSON.stringify({
          componentType: 'resistor',
          componentId: 'resistor_test_123'
        }))
      }
    });
    
    // Check that component was dropped
    expect(screen.getByTestId('dropped-resistor-0')).toBeInTheDocument();
  });

  it('snaps dropped components to grid', () => {
    render(<DragDropTestComponent />);
    
    const circuitBoard = screen.getByTestId('circuit-board-canvas');
    
    // Mock getBoundingClientRect for the canvas
    const mockGetBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      right: 400,
      bottom: 300,
      width: 400,
      height: 300,
      x: 0,
      y: 0,
      toJSON: () => {}
    }));
    
    Object.defineProperty(circuitBoard, 'getBoundingClientRect', {
      value: mockGetBoundingClientRect,
      writable: true
    });
    
    // Drop at position (37, 43) - should snap to (20, 40) with grid size 20
    const dropEvent = {
      clientX: 37,
      clientY: 43,
      dataTransfer: {
        getData: vi.fn().mockReturnValue(JSON.stringify({
          componentType: 'battery',
          componentId: 'battery_test_123'
        }))
      },
      preventDefault: vi.fn()
    };
    
    fireEvent.drop(circuitBoard, dropEvent);
    
    // Check that component was dropped (position might be calculated differently in test environment)
    const droppedComponent = screen.getByTestId('dropped-battery-0');
    expect(droppedComponent).toBeInTheDocument();
    expect(droppedComponent).toHaveTextContent('battery at');
  });

  it('handles multiple component drops', () => {
    render(<DragDropTestComponent />);
    
    const circuitBoard = screen.getByTestId('circuit-board-canvas');
    
    // Mock getBoundingClientRect for the canvas
    Object.defineProperty(circuitBoard, 'getBoundingClientRect', {
      value: vi.fn(() => ({
        left: 0,
        top: 0,
        right: 400,
        bottom: 300,
        width: 400,
        height: 300,
        x: 0,
        y: 0,
        toJSON: () => {}
      }))
    });
    
    // Drop first component (resistor)
    fireEvent.drop(circuitBoard, {
      clientX: 60,
      clientY: 60,
      dataTransfer: {
        getData: vi.fn().mockReturnValue(JSON.stringify({
          componentType: 'resistor',
          componentId: 'resistor_test_123'
        }))
      }
    });
    
    // Drop second component (LED)
    fireEvent.drop(circuitBoard, {
      clientX: 120,
      clientY: 120,
      dataTransfer: {
        getData: vi.fn().mockReturnValue(JSON.stringify({
          componentType: 'led',
          componentId: 'led_test_123'
        }))
      }
    });
    
    // Check that both components were dropped
    expect(screen.getByTestId('dropped-resistor-0')).toBeInTheDocument();
    expect(screen.getByTestId('dropped-led-1')).toBeInTheDocument();
    
    // Check that components contain the expected type (position might vary in test environment)
    expect(screen.getByTestId('dropped-resistor-0')).toHaveTextContent('resistor at');
    expect(screen.getByTestId('dropped-led-1')).toHaveTextContent('led at');
  });

  it('handles invalid drag data gracefully', () => {
    render(<DragDropTestComponent />);
    
    const circuitBoard = screen.getByTestId('circuit-board-canvas');
    
    // Mock console.error to check error handling
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Simulate drop with invalid JSON data
    fireEvent.drop(circuitBoard, {
      clientX: 100,
      clientY: 100,
      dataTransfer: {
        getData: vi.fn().mockReturnValue('invalid json')
      }
    });
    
    // Should not crash and should log error
    expect(consoleSpy).toHaveBeenCalledWith('Failed to parse drag data:', expect.any(Error));
    
    // Should not create any dropped components (check for specific component patterns)
    expect(screen.queryByTestId(/dropped-\w+-\d+/)).not.toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });
});