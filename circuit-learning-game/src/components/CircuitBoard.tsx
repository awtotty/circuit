import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { Position, ComponentType } from '../types';
import type { IElectricalComponent } from '../types/components';
import { ComponentRenderer, type RenderingContext } from '../services/ComponentRenderer';

export interface CircuitBoardProps {
  width?: number;
  height?: number;
  gridSize?: number;
  components?: IElectricalComponent[];
  onCanvasClick?: (position: Position, component?: IElectricalComponent) => void;
  onCanvasMouseMove?: (position: Position) => void;
  onComponentDrop?: (componentType: ComponentType, componentId: string, position: Position) => void;
  onComponentSelect?: (componentId: string) => void;
  onComponentDeselect?: (componentId: string) => void;
}

export interface GridCoordinates {
  gridX: number;
  gridY: number;
}

export const CircuitBoard: React.FC<CircuitBoardProps> = ({
  width = 800,
  height = 600,
  gridSize = 20,
  components = [],
  onCanvasClick,
  onCanvasMouseMove,
  onComponentDrop,
  onComponentSelect,
  onComponentDeselect,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ComponentRenderer>(new ComponentRenderer());
  const [mousePosition, setMousePosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragPosition, setDragPosition] = useState<Position | null>(null);

  // Convert canvas coordinates to grid coordinates
  const canvasToGrid = useCallback((canvasPos: Position): GridCoordinates => {
    return {
      gridX: Math.floor(canvasPos.x / gridSize),
      gridY: Math.floor(canvasPos.y / gridSize),
    };
  }, [gridSize]);

  // Convert grid coordinates to canvas coordinates
  const gridToCanvas = useCallback((gridPos: GridCoordinates): Position => {
    return {
      x: gridPos.gridX * gridSize,
      y: gridPos.gridY * gridSize,
    };
  }, [gridSize]);

  // Snap position to grid
  const snapToGrid = useCallback((position: Position): Position => {
    const gridPos = canvasToGrid(position);
    return gridToCanvas(gridPos);
  }, [canvasToGrid, gridToCanvas]);

  // Get mouse position relative to canvas
  const getCanvasMousePosition = useCallback((event: MouseEvent): Position => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }, []);

  // Get drag position relative to canvas
  const getDragPosition = useCallback((event: DragEvent): Position => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }, []);

  // Draw grid on canvas
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;

    // Draw vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }, [width, height, gridSize]);

  // Draw drop zone highlight
  const drawDropZone = useCallback((ctx: CanvasRenderingContext2D, position: Position) => {
    const snappedPos = snapToGrid(position);
    
    // Draw highlight circle
    ctx.fillStyle = 'rgba(0, 123, 255, 0.2)';
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.arc(snappedPos.x + gridSize / 2, snappedPos.y + gridSize / 2, gridSize / 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Draw grid cell highlight
    ctx.fillStyle = 'rgba(0, 123, 255, 0.1)';
    ctx.fillRect(snappedPos.x, snappedPos.y, gridSize, gridSize);
  }, [snapToGrid, gridSize]);

  // Handle mouse click
  const handleMouseClick = useCallback((event: MouseEvent) => {
    const canvasPos = getCanvasMousePosition(event);
    const snappedPos = snapToGrid(canvasPos);
    
    // Check if click is on a component
    const clickedComponent = rendererRef.current.getComponentAtPosition(components, canvasPos);
    
    if (clickedComponent) {
      // Handle component selection
      if (event.ctrlKey || event.metaKey) {
        // Multi-select with Ctrl/Cmd
        rendererRef.current.toggleSelection(clickedComponent.id);
        if (rendererRef.current.isSelected(clickedComponent.id)) {
          onComponentSelect?.(clickedComponent.id);
        } else {
          onComponentDeselect?.(clickedComponent.id);
        }
      } else {
        // Single select
        rendererRef.current.clearSelection();
        rendererRef.current.selectComponent(clickedComponent.id);
        onComponentSelect?.(clickedComponent.id);
      }
    } else {
      // Click on empty space - clear selection
      rendererRef.current.clearSelection();
    }
    
    if (onCanvasClick) {
      onCanvasClick(snappedPos, clickedComponent || undefined);
    }
  }, [getCanvasMousePosition, snapToGrid, onCanvasClick, components, onComponentSelect, onComponentDeselect]);

  // Handle mouse move
  const handleMouseMove = useCallback((event: MouseEvent) => {
    const canvasPos = getCanvasMousePosition(event);
    const snappedPos = snapToGrid(canvasPos);
    
    setMousePosition(snappedPos);
    
    if (onCanvasMouseMove) {
      onCanvasMouseMove(snappedPos);
    }
  }, [getCanvasMousePosition, snapToGrid, onCanvasMouseMove]);

  // Handle drag over
  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    
    const dragPos = getDragPosition(event);
    const snappedPos = snapToGrid(dragPos);
    
    setIsDragOver(true);
    setDragPosition(snappedPos);
  }, [getDragPosition, snapToGrid]);

  // Handle drag enter
  const handleDragEnter = useCallback((event: DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  // Handle drag leave
  const handleDragLeave = useCallback((event: DragEvent) => {
    event.preventDefault();
    
    // Only set drag over to false if we're actually leaving the canvas
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      if (x < 0 || x > width || y < 0 || y > height) {
        setIsDragOver(false);
        setDragPosition(null);
      }
    }
  }, [width, height]);

  // Handle drop
  const handleDrop = useCallback((event: DragEvent) => {
    event.preventDefault();
    
    try {
      if (!event.dataTransfer) return;
      
      const dragData = JSON.parse(event.dataTransfer.getData('application/json'));
      const { componentType, componentId } = dragData;
      
      const dropPos = getDragPosition(event);
      const snappedPos = snapToGrid(dropPos);
      
      if (onComponentDrop) {
        onComponentDrop(componentType, componentId, snappedPos);
      }
    } catch (error) {
      console.error('Failed to parse drag data:', error);
    }
    
    setIsDragOver(false);
    setDragPosition(null);
  }, [getDragPosition, snapToGrid, onComponentDrop]);

  // Handle mouse hover for component highlighting
  const handleMouseHover = useCallback((event: MouseEvent) => {
    const canvasPos = getCanvasMousePosition(event);
    const hoveredComponent = rendererRef.current.getComponentAtPosition(components, canvasPos);
    
    if (hoveredComponent) {
      rendererRef.current.setHighlighted(hoveredComponent.id);
    } else {
      rendererRef.current.setHighlighted(null);
    }
  }, [getCanvasMousePosition, components]);

  // Initialize canvas and event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas and draw grid
    ctx.clearRect(0, 0, width, height);
    drawGrid(ctx);

    // Render components
    const renderingContext: RenderingContext = {
      ctx,
      gridSize,
      scale: 1
    };
    
    rendererRef.current.renderComponents(components, renderingContext);

    // Draw drop zone if dragging
    if (isDragOver && dragPosition) {
      drawDropZone(ctx, dragPosition);
    }

    // Add event listeners
    canvas.addEventListener('click', handleMouseClick);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousemove', handleMouseHover);
    canvas.addEventListener('dragover', handleDragOver);
    canvas.addEventListener('dragenter', handleDragEnter);
    canvas.addEventListener('dragleave', handleDragLeave);
    canvas.addEventListener('drop', handleDrop);

    return () => {
      canvas.removeEventListener('click', handleMouseClick);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousemove', handleMouseHover);
      canvas.removeEventListener('dragover', handleDragOver);
      canvas.removeEventListener('dragenter', handleDragEnter);
      canvas.removeEventListener('dragleave', handleDragLeave);
      canvas.removeEventListener('drop', handleDrop);
    };
  }, [width, height, drawGrid, handleMouseClick, handleMouseMove, handleMouseHover, handleDragOver, handleDragEnter, handleDragLeave, handleDrop, isDragOver, dragPosition, drawDropZone, components, gridSize]);

  return (
    <div className="circuit-board-container">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          border: '2px solid #333',
          cursor: 'crosshair',
          backgroundColor: '#fafafa',
        }}
        data-testid="circuit-board-canvas"
      />
      <div className="mouse-position-display" style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
        Mouse Position: ({mousePosition.x}, {mousePosition.y})
      </div>
    </div>
  );
};

export default CircuitBoard;