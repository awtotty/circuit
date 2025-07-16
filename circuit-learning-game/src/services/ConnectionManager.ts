// Connection management system for handling wire connections between components

import type { Position, Connection } from '../types';
import type { IElectricalComponent, Terminal } from '../types/components';

export interface ConnectionPoint {
  componentId: string;
  terminalId: string;
  position: Position;
  terminal: Terminal;
}

export interface WireDrawingState {
  isDrawing: boolean;
  startPoint: ConnectionPoint | null;
  currentMousePosition: Position | null;
  previewPath: Position[];
}

export interface ConnectionValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

export class ConnectionManager {
  private connections: Map<string, Connection> = new Map();
  private wireDrawingState: WireDrawingState = {
    isDrawing: false,
    startPoint: null,
    currentMousePosition: null,
    previewPath: []
  };

  /**
   * Start drawing a wire from a terminal
   */
  public startWireDrawing(connectionPoint: ConnectionPoint): void {
    this.wireDrawingState = {
      isDrawing: true,
      startPoint: connectionPoint,
      currentMousePosition: connectionPoint.position,
      previewPath: [connectionPoint.position]
    };
  }

  /**
   * Update wire drawing with current mouse position
   */
  public updateWireDrawing(mousePosition: Position): void {
    if (!this.wireDrawingState.isDrawing) return;

    this.wireDrawingState.currentMousePosition = mousePosition;
    
    // Update preview path - for now just direct line, could be enhanced with routing
    if (this.wireDrawingState.startPoint) {
      this.wireDrawingState.previewPath = [
        this.wireDrawingState.startPoint.position,
        mousePosition
      ];
    }
  }

  /**
   * Complete wire drawing by connecting to an end terminal
   */
  public completeWireDrawing(
    endPoint: ConnectionPoint,
    components: IElectricalComponent[]
  ): Connection | null {
    if (!this.wireDrawingState.isDrawing || !this.wireDrawingState.startPoint) {
      return null;
    }

    const startPoint = this.wireDrawingState.startPoint;
    
    // Validate the connection
    const validation = this.validateConnection(startPoint, endPoint, components);
    if (!validation.isValid) {
      console.warn('Invalid connection:', validation.error);
      this.cancelWireDrawing();
      return null;
    }

    // Create the connection
    const connection: Connection = {
      id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fromComponent: startPoint.componentId,
      toComponent: endPoint.componentId,
      fromTerminal: startPoint.terminalId,
      toTerminal: endPoint.terminalId
    };

    // Store the connection
    this.connections.set(connection.id, connection);

    // Update terminal connection status
    startPoint.terminal.connected = true;
    startPoint.terminal.connectionId = connection.id;
    endPoint.terminal.connected = true;
    endPoint.terminal.connectionId = connection.id;

    // Clear drawing state
    this.cancelWireDrawing();

    return connection;
  }

  /**
   * Cancel wire drawing
   */
  public cancelWireDrawing(): void {
    this.wireDrawingState = {
      isDrawing: false,
      startPoint: null,
      currentMousePosition: null,
      previewPath: []
    };
  }

  /**
   * Validate a connection between two terminals
   */
  public validateConnection(
    startPoint: ConnectionPoint,
    endPoint: ConnectionPoint,
    components: IElectricalComponent[]
  ): ConnectionValidationResult {
    // Cannot connect to the same component
    if (startPoint.componentId === endPoint.componentId) {
      return {
        isValid: false,
        error: 'Cannot connect a component to itself'
      };
    }

    // Cannot connect if either terminal is already connected
    if (startPoint.terminal.connected) {
      return {
        isValid: false,
        error: 'Start terminal is already connected'
      };
    }

    if (endPoint.terminal.connected) {
      return {
        isValid: false,
        error: 'End terminal is already connected'
      };
    }

    // Check terminal type compatibility
    const startType = startPoint.terminal.type;
    const endType = endPoint.terminal.type;

    // Output can only connect to input (or bidirectional)
    if (startType === 'output' && endType === 'output') {
      return {
        isValid: false,
        error: 'Cannot connect two output terminals'
      };
    }

    // Input can only connect to output (or bidirectional)
    if (startType === 'input' && endType === 'input') {
      return {
        isValid: false,
        error: 'Cannot connect two input terminals'
      };
    }

    // Check for existing connection between these components
    const existingConnection = this.findConnectionBetweenComponents(
      startPoint.componentId,
      endPoint.componentId
    );

    if (existingConnection) {
      return {
        isValid: false,
        error: 'Components are already connected'
      };
    }

    // All validations passed
    return { isValid: true };
  }

  /**
   * Find terminal at a given position
   */
  public findTerminalAtPosition(
    components: IElectricalComponent[],
    position: Position,
    tolerance: number = 8
  ): ConnectionPoint | null {
    for (const component of components) {
      for (const terminal of component.terminals) {
        const distance = Math.sqrt(
          Math.pow(position.x - terminal.position.x, 2) +
          Math.pow(position.y - terminal.position.y, 2)
        );

        if (distance <= tolerance) {
          return {
            componentId: component.id,
            terminalId: terminal.id,
            position: terminal.position,
            terminal
          };
        }
      }
    }

    return null;
  }

  /**
   * Get current wire drawing state
   */
  public getWireDrawingState(): WireDrawingState {
    return { ...this.wireDrawingState };
  }

  /**
   * Get all connections
   */
  public getConnections(): Connection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connection by ID
   */
  public getConnection(connectionId: string): Connection | null {
    return this.connections.get(connectionId) || null;
  }

  /**
   * Remove a connection
   */
  public removeConnection(connectionId: string, components: IElectricalComponent[]): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    // Update terminal connection status
    const fromComponent = components.find(c => c.id === connection.fromComponent);
    const toComponent = components.find(c => c.id === connection.toComponent);

    if (fromComponent) {
      const fromTerminal = fromComponent.terminals.find(t => t.id === connection.fromTerminal);
      if (fromTerminal) {
        fromTerminal.connected = false;
        fromTerminal.connectionId = undefined;
      }
    }

    if (toComponent) {
      const toTerminal = toComponent.terminals.find(t => t.id === connection.toTerminal);
      if (toTerminal) {
        toTerminal.connected = false;
        toTerminal.connectionId = undefined;
      }
    }

    // Remove the connection
    this.connections.delete(connectionId);
    return true;
  }

  /**
   * Find connection between two components
   */
  private findConnectionBetweenComponents(
    componentId1: string,
    componentId2: string
  ): Connection | null {
    for (const connection of this.connections.values()) {
      if (
        (connection.fromComponent === componentId1 && connection.toComponent === componentId2) ||
        (connection.fromComponent === componentId2 && connection.toComponent === componentId1)
      ) {
        return connection;
      }
    }
    return null;
  }

  /**
   * Get connections for a specific component
   */
  public getComponentConnections(componentId: string): Connection[] {
    return Array.from(this.connections.values()).filter(
      connection =>
        connection.fromComponent === componentId ||
        connection.toComponent === componentId
    );
  }

  /**
   * Clear all connections
   */
  public clearAllConnections(components: IElectricalComponent[]): void {
    // Update all terminal connection status
    for (const component of components) {
      for (const terminal of component.terminals) {
        terminal.connected = false;
        terminal.connectionId = undefined;
      }
    }

    // Clear all connections
    this.connections.clear();
  }
}