// React import removed as it's not used in this test file
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentPalette } from '../ComponentPalette';
import type { ComponentType } from '../../types';

// Mock the component utils
vi.mock('../../utilities/component-utils', () => ({
  generateComponentId: vi.fn((type: ComponentType) => `${type}_test_123`)
}));

describe('ComponentPalette', () => {
  const mockOnComponentDragStart = vi.fn();
  const mockOnComponentDragEnd = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the component palette with all available components', () => {
    render(<ComponentPalette />);
    
    expect(screen.getByTestId('component-palette')).toBeInTheDocument();
    expect(screen.getByText('Components')).toBeInTheDocument();
    
    // Check that all expected components are rendered
    expect(screen.getByTestId('palette-item-resistor')).toBeInTheDocument();
    expect(screen.getByTestId('palette-item-battery')).toBeInTheDocument();
    expect(screen.getByTestId('palette-item-led')).toBeInTheDocument();
    expect(screen.getByTestId('palette-item-wire')).toBeInTheDocument();
    
    // Check component names
    expect(screen.getByText('Resistor')).toBeInTheDocument();
    expect(screen.getByText('Battery')).toBeInTheDocument();
    expect(screen.getByText('LED')).toBeInTheDocument();
    expect(screen.getByText('Wire')).toBeInTheDocument();
  });

  it('makes all palette items draggable', () => {
    render(<ComponentPalette />);
    
    const resistorItem = screen.getByTestId('palette-item-resistor');
    const batteryItem = screen.getByTestId('palette-item-battery');
    const ledItem = screen.getByTestId('palette-item-led');
    const wireItem = screen.getByTestId('palette-item-wire');
    
    expect(resistorItem).toHaveAttribute('draggable', 'true');
    expect(batteryItem).toHaveAttribute('draggable', 'true');
    expect(ledItem).toHaveAttribute('draggable', 'true');
    expect(wireItem).toHaveAttribute('draggable', 'true');
  });

  it('calls onComponentDragStart when drag starts', () => {
    render(
      <ComponentPalette 
        onComponentDragStart={mockOnComponentDragStart}
        onComponentDragEnd={mockOnComponentDragEnd}
      />
    );
    
    const resistorItem = screen.getByTestId('palette-item-resistor');
    
    // Use fireEvent.dragStart with mock dataTransfer
    fireEvent.dragStart(resistorItem, {
      dataTransfer: {
        setData: vi.fn(),
        setDragImage: vi.fn(),
        effectAllowed: ''
      }
    });
    
    expect(mockOnComponentDragStart).toHaveBeenCalledWith('resistor', 'resistor_test_123');
  });

  it('calls onComponentDragEnd when drag ends', () => {
    render(
      <ComponentPalette 
        onComponentDragStart={mockOnComponentDragStart}
        onComponentDragEnd={mockOnComponentDragEnd}
      />
    );
    
    const resistorItem = screen.getByTestId('palette-item-resistor');
    
    fireEvent.dragEnd(resistorItem);
    
    expect(mockOnComponentDragEnd).toHaveBeenCalled();
  });

  it('sets correct drag data when dragging components', () => {
    render(<ComponentPalette />);
    
    const batteryItem = screen.getByTestId('palette-item-battery');
    
    const mockSetData = vi.fn();
    
    // Use fireEvent.dragStart with mock dataTransfer
    fireEvent.dragStart(batteryItem, {
      dataTransfer: {
        setData: mockSetData,
        setDragImage: vi.fn(),
        effectAllowed: ''
      }
    });
    
    expect(mockSetData).toHaveBeenCalledWith(
      'application/json',
      JSON.stringify({
        componentType: 'battery',
        componentId: 'battery_test_123'
      })
    );
  });

  it('applies custom className when provided', () => {
    render(<ComponentPalette className="custom-palette" />);
    
    const palette = screen.getByTestId('component-palette');
    expect(palette).toHaveClass('component-palette', 'custom-palette');
  });

  it('shows component descriptions as tooltips', () => {
    render(<ComponentPalette />);
    
    const resistorItem = screen.getByTestId('palette-item-resistor');
    const batteryItem = screen.getByTestId('palette-item-battery');
    const ledItem = screen.getByTestId('palette-item-led');
    const wireItem = screen.getByTestId('palette-item-wire');
    
    expect(resistorItem).toHaveAttribute('title', 'Limits current flow');
    expect(batteryItem).toHaveAttribute('title', 'Provides electrical power');
    expect(ledItem).toHaveAttribute('title', 'Light emitting diode');
    expect(wireItem).toHaveAttribute('title', 'Connects components');
  });
});