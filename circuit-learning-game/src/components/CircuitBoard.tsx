import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { Position, ComponentType, Connection } from '../types';
import type { IElectricalComponent } from '../types/components';
import { ComponentRenderer, type RenderingContext } from '../services/ComponentRenderer';
import { ConnectionManager, type ConnectionPoint } from '../services/ConnectionManager';
import { CircuitSimulator, type SimulationResult } from '../services/CircuitSimulator';
import { SimulationVisualizer, type VisualizationOptions } from '../services/SimulationVisualizer';

export interface CircuitBoardProps {
  width?: number;
  height?: number;
  gridSize?: number;
  components?: IElectricalComponent[];
  connections?: Connection[];
  onCanvasClick?: (position: Position, component?: IElectricalComponent) => void;
  onCanvasMouseMove?: (position: Position) => void;
  onComponentDrop?: (componentType: ComponentType, componentId: string, position: Position) => void;
  onComponentSelect?: (componentId: string) => void;
  onComponentDeselect?: (componentId: string) => void;
  onConnectionCreate?: (connection: Connection) => void;
  onConnectionDelete?: (connectionId: string) => void;
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
  connections = [],
  onCanvasClick,
  onCanvasMouseMove,
  onComponentDrop,
  onComponentSelect,
  onComponentDeselect,
  onConnectionCreate,
  onConnectionDelete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ComponentRenderer>(new ComponentRenderer());
  const connectionManagerRef = useRef<ConnectionManager>(new ConnectionManager());
  const simulatorRef = useRef<CircuitSimulator>(new CircuitSimulator());
  const visualizerRef = useRef<SimulationVisualizer>(new SimulationVisualizer());
  const [mousePosition, setMousePosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragPosition, setDragPosition] = useState<Position | null>(null);
  const [isWireMode, setIsWireMode] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [visualizationOptions, setVisualizationOptions] = useState<VisualizationOptions>({
    showCurrentFlow: true,
    showVoltageLabels: true,
    showCurrentLabels: true,
    showResistanceLabels: false,
    particleCount: 10,
    animationSpeed: 1.0,
    particleSize: 3
  });

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

  // Draw connections (wires)
  const drawConnections = useCallback((ctx: CanvasRenderingContext2D) => {
    connections.forEach(connection => {
      const fromComponent = components.find(c => c.id === connection.fromComponent);
      const toComponent = components.find(c => c.id === connection.toComponent);
      
      if (!fromComponent || !toComponent) return;
      
      const fromTerminal = fromComponent.terminals.find(t => t.id === connection.fromTerminal);
      const toTerminal = toComponent.terminals.find(t => t.id === connection.toTerminal);
      
      if (!fromTerminal || !toTerminal) return;
      
      // Draw wire
      ctx.strokeStyle = '#28a745';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fromTerminal.position.x, fromTerminal.position.y);
      ctx.lineTo(toTerminal.position.x, toTerminal.position.y);
      ctx.stroke();
    });
  }, [connections, components]);

  // Draw wire preview during drawing
  const drawWirePreview = useCallback((ctx: CanvasRenderingContext2D) => {
    const wireState = connectionManagerRef.current.getWireDrawingState();
    
    if (!wireState.isDrawing || !wireState.startPoint || !wireState.currentMousePosition) {
      return;
    }
    
    // Draw preview wire
    ctx.strokeStyle = '#ffc107';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    ctx.beginPath();
    ctx.moveTo(wireState.startPoint.position.x, wireState.startPoint.position.y);
    ctx.lineTo(wireState.currentMousePosition.x, wireState.currentMousePosition.y);
    ctx.stroke();
    
    ctx.setLineDash([]); // Reset line dash
  }, []);

  // Handle mouse click
  const handleMouseClick = useCallback((event: MouseEvent) => {
    const canvasPos = getCanvasMousePosition(event);
    const snappedPos = snapToGrid(canvasPos);
    
    // Check if click is on a terminal for wire drawing
    const clickedTerminal = connectionManagerRef.current.findTerminalAtPosition(components, canvasPos);
    
    if (clickedTerminal && isWireMode) {
      const wireState = connectionManagerRef.current.getWireDrawingState();
      
      if (!wireState.isDrawing) {
        // Start wire drawing from this terminal
        connectionManagerRef.current.startWireDrawing(clickedTerminal);
      } else {
        // Complete wire drawing to this terminal
        const newConnection = connectionManagerRef.current.completeWireDrawing(clickedTerminal, components);
        if (newConnection && onConnectionCreate) {
          onConnectionCreate(newConnection);
        }
      }
      return;
    }
    
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
      // Click on empty space - clear selection and cancel wire drawing
      rendererRef.current.clearSelection();
      if (connectionManagerRef.current.getWireDrawingState().isDrawing) {
        connectionManagerRef.current.cancelWireDrawing();
      }
    }
    
    if (onCanvasClick) {
      onCanvasClick(snappedPos, clickedComponent || undefined);
    }
  }, [getCanvasMousePosition, snapToGrid, onCanvasClick, components, onComponentSelect, onComponentDeselect, isWireMode, onConnectionCreate]);

  // Handle mouse move
  const handleMouseMove = useCallback((event: MouseEvent) => {
    const canvasPos = getCanvasMousePosition(event);
    const snappedPos = snapToGrid(canvasPos);
    
    setMousePosition(snappedPos);
    
    // Update wire drawing if in progress
    if (connectionManagerRef.current.getWireDrawingState().isDrawing) {
      connectionManagerRef.current.updateWireDrawing(canvasPos);
    }
    
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

  // Run circuit simulation
  const runSimulation = useCallback(() => {
    if (components.length === 0) {
      setSimulationResult(null);
      return;
    }

    const result = simulatorRef.current.simulate(components, connections);
    setSimulationResult(result);
    
    // Update visualizer with new simulation results
    if (result.isValid) {
      visualizerRef.current.updateSimulation(result, components, connections);
    }
  }, [components, connections]);

  // Toggle simulation running state
  const toggleSimulation = useCallback(() => {
    if (isSimulationRunning) {
      visualizerRef.current.stopAnimation();
      setIsSimulationRunning(false);
    } else {
      // Run simulation first
      runSimulation();
      
      // Start animation with render callback
      visualizerRef.current.startAnimation(() => {
        // This will trigger a re-render of the canvas
        const canvas = canvasRef.current;
        if (canvas) {
          const event = new CustomEvent('visualizationUpdate');
          canvas.dispatchEvent(event);
        }
      });
      setIsSimulationRunning(true);
    }
  }, [isSimulationRunning, runSimulation]);

  // Update visualization options
  const updateVisualizationOptions = useCallback((newOptions: Partial<VisualizationOptions>) => {
    const updatedOptions = { ...visualizationOptions, ...newOptions };
    setVisualizationOptions(updatedOptions);
    visualizerRef.current.updateOptions(updatedOptions);
  }, [visualizationOptions]);

  // Initialize canvas and event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas and draw grid
    ctx.clearRect(0, 0, width, height);
    drawGrid(ctx);

    // Draw connections first (behind components)
    drawConnections(ctx);

    // Render components
    const renderingContext: RenderingContext = {
      ctx,
      gridSize,
      scale: 1
    };
    
    rendererRef.current.renderComponents(components, renderingContext);

    // Draw wire preview if drawing
    drawWirePreview(ctx);

    // Render simulation visualization if active
    if (simulationResult && isSimulationRunning) {
      visualizerRef.current.render(ctx, simulationResult, components, connections);
    }

    // Draw drop zone if dragging
    if (isDragOver && dragPosition) {
      drawDropZone(ctx, dragPosition);
    }

    // Handle visualization updates
    const handleVisualizationUpdate = () => {
      // Force re-render by updating a state or directly redrawing
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Clear and redraw everything
        ctx.clearRect(0, 0, width, height);
        drawGrid(ctx);
        drawConnections(ctx);
        
        const renderingContext: RenderingContext = {
          ctx,
          gridSize,
          scale: 1
        };
        
        rendererRef.current.renderComponents(components, renderingContext);
        drawWirePreview(ctx);
        
        if (simulationResult && isSimulationRunning) {
          visualizerRef.current.render(ctx, simulationResult, components, connections);
        }
        
        if (isDragOver && dragPosition) {
          drawDropZone(ctx, dragPosition);
        }
      }
    };

    // Add event listeners
    canvas.addEventListener('click', handleMouseClick);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousemove', handleMouseHover);
    canvas.addEventListener('dragover', handleDragOver);
    canvas.addEventListener('dragenter', handleDragEnter);
    canvas.addEventListener('dragleave', handleDragLeave);
    canvas.addEventListener('drop', handleDrop);
    canvas.addEventListener('visualizationUpdate', handleVisualizationUpdate);

    return () => {
      canvas.removeEventListener('click', handleMouseClick);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousemove', handleMouseHover);
      canvas.removeEventListener('dragover', handleDragOver);
      canvas.removeEventListener('dragenter', handleDragEnter);
      canvas.removeEventListener('dragleave', handleDragLeave);
      canvas.removeEventListener('drop', handleDrop);
      canvas.removeEventListener('visualizationUpdate', handleVisualizationUpdate);
    };
  }, [width, height, drawGrid, drawConnections, drawWirePreview, handleMouseClick, handleMouseMove, handleMouseHover, handleDragOver, handleDragEnter, handleDragLeave, handleDrop, isDragOver, dragPosition, drawDropZone, components, gridSize]);

  return (
    <div className="circuit-board-container">
      <div className="circuit-board-controls" style={{ marginBottom: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setIsWireMode(!isWireMode)}
          style={{
            padding: '8px 16px',
            backgroundColor: isWireMode ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          data-testid="wire-mode-toggle"
        >
          {isWireMode ? 'Exit Wire Mode' : 'Wire Mode'}
        </button>
        
        <button
          onClick={toggleSimulation}
          style={{
            padding: '8px 16px',
            backgroundColor: isSimulationRunning ? '#dc3545' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          data-testid="simulation-toggle"
        >
          {isSimulationRunning ? 'Stop Simulation' : 'Start Simulation'}
        </button>
        
        <button
          onClick={runSimulation}
          disabled={isSimulationRunning}
          style={{
            padding: '8px 16px',
            backgroundColor: isSimulationRunning ? '#6c757d' : '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isSimulationRunning ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
          data-testid="run-simulation"
        >
          Run Once
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <label style={{ fontSize: '12px', color: '#666' }}>Current Flow:</label>
          <input
            type="checkbox"
            checked={visualizationOptions.showCurrentFlow}
            onChange={(e) => updateVisualizationOptions({ showCurrentFlow: e.target.checked })}
            data-testid="show-current-flow"
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <label style={{ fontSize: '12px', color: '#666' }}>Labels:</label>
          <input
            type="checkbox"
            checked={visualizationOptions.showVoltageLabels}
            onChange={(e) => updateVisualizationOptions({ showVoltageLabels: e.target.checked })}
            data-testid="show-voltage-labels"
          />
          <span style={{ fontSize: '11px', color: '#666' }}>V</span>
          <input
            type="checkbox"
            checked={visualizationOptions.showCurrentLabels}
            onChange={(e) => updateVisualizationOptions({ showCurrentLabels: e.target.checked })}
            data-testid="show-current-labels"
          />
          <span style={{ fontSize: '11px', color: '#666' }}>I</span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          border: '2px solid #333',
          cursor: isWireMode ? 'crosshair' : 'default',
          backgroundColor: '#fafafa',
        }}
        data-testid="circuit-board-canvas"
      />
      <div className="mouse-position-display" style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
        Mouse Position: ({mousePosition.x}, {mousePosition.y})
        {isWireMode && <span style={{ marginLeft: '16px', color: '#007bff' }}>Wire Mode Active</span>}
      </div>
    </div>
  );
};

export default CircuitBoard;