// Circuit validation and error detection service

import type { Connection } from '../types';
import type { IElectricalComponent } from '../types/components';
import { Battery, Resistor, LED, Wire } from '../types/electrical-components';

export interface CircuitError {
  id: string;
  type: ErrorType;
  severity: 'error' | 'warning' | 'info';
  message: string;
  educationalExplanation: string;
  affectedComponents: string[];
  affectedConnections: string[];
  suggestedFix?: string;
  visualHighlight?: HighlightInfo;
}

export interface HighlightInfo {
  type: 'component' | 'connection' | 'area';
  targets: string[];
  color: string;
  style: 'solid' | 'dashed' | 'pulsing';
}

export type ErrorType =
  | 'short_circuit'
  | 'open_circuit'
  | 'no_power_source'
  | 'disconnected_component'
  | 'invalid_connection'
  | 'component_overload'
  | 'reverse_polarity'
  | 'missing_current_limiting'
  | 'floating_node'
  | 'duplicate_connection';

export interface ValidationResult {
  isValid: boolean;
  errors: CircuitError[];
  warnings: CircuitError[];
  info: CircuitError[];
}

export class CircuitValidator {
  private errorCounter = 0;

  /**
   * Validate the complete circuit and return all errors, warnings, and info
   */
  public validateCircuit(
    components: IElectricalComponent[],
    connections: Connection[]
  ): ValidationResult {
    const errors: CircuitError[] = [];
    const warnings: CircuitError[] = [];
    const info: CircuitError[] = [];

    // Run all validation checks
    const validationResults = [
      this.checkForShortCircuits(components, connections),
      this.checkForOpenCircuits(components, connections),
      this.checkForPowerSources(components),
      this.checkForDisconnectedComponents(components, connections),
      this.checkForInvalidConnections(components, connections),
      this.checkForComponentOverloads(components, connections),
      this.checkForReversePolarity(components, connections),
      this.checkForMissingCurrentLimiting(components, connections),
      this.checkForFloatingNodes(components, connections),
      this.checkForDuplicateConnections(connections)
    ];

    // Categorize results
    for (const result of validationResults) {
      for (const error of result) {
        switch (error.severity) {
          case 'error':
            errors.push(error);
            break;
          case 'warning':
            warnings.push(error);
            break;
          case 'info':
            info.push(error);
            break;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      info
    };
  }

  /**
   * Check for short circuits - direct connections between battery terminals
   */
  private checkForShortCircuits(
    components: IElectricalComponent[],
    connections: Connection[]
  ): CircuitError[] {
    const errors: CircuitError[] = [];
    const batteries = components.filter(c => c.type === 'battery') as Battery[];

    for (const battery of batteries) {
      // Find all paths from positive to negative terminal
      const shortCircuitPaths = this.findDirectPaths(
        battery.id,
        'positive',
        'negative',
        components,
        connections,
        []
      );

      for (const path of shortCircuitPaths) {
        // Check if path has no significant resistance
        const pathResistance = this.calculatePathResistance(path, components);
        
        if (pathResistance < 1) { // Less than 1 ohm indicates short circuit
          const affectedComponents = path.map(p => p.componentId);
          const affectedConnections = path.slice(1).map(p => p.connectionId).filter(Boolean);

          errors.push({
            id: this.generateErrorId(),
            type: 'short_circuit',
            severity: 'error',
            message: `Short circuit detected: Battery ${battery.id} terminals are directly connected with very low resistance`,
            educationalExplanation: 
              'A short circuit occurs when electricity can flow directly from the positive to negative terminal of a battery without going through any significant resistance. ' +
              'This causes extremely high current flow that can damage components and drain the battery quickly. ' +
              'In real circuits, this could cause overheating, fire, or explosion.',
            affectedComponents,
            affectedConnections,
            suggestedFix: 'Add a resistor or other component between the battery terminals to limit current flow.',
            visualHighlight: {
              type: 'component',
              targets: affectedComponents,
              color: '#ff0000',
              style: 'pulsing'
            }
          });
        }
      }
    }

    return errors;
  }

  /**
   * Check for open circuits - components that are not connected to complete circuits
   */
  private checkForOpenCircuits(
    components: IElectricalComponent[],
    connections: Connection[]
  ): CircuitError[] {
    const errors: CircuitError[] = [];
    const batteries = components.filter(c => c.type === 'battery') as Battery[];

    for (const battery of batteries) {
      // Check if there's a complete path from positive to negative terminal
      const completePaths = this.findCompletePaths(
        battery.id,
        'positive',
        'negative',
        components,
        connections
      );

      if (completePaths.length === 0) {
        errors.push({
          id: this.generateErrorId(),
          type: 'open_circuit',
          severity: 'error',
          message: `Open circuit: No complete path from positive to negative terminal of battery ${battery.id}`,
          educationalExplanation:
            'An open circuit means there is no complete path for electricity to flow from the positive terminal of the battery, ' +
            'through the circuit components, and back to the negative terminal. Without a complete circuit, no current can flow ' +
            'and the circuit will not work. This is like having a broken wire in the circuit.',
          affectedComponents: [battery.id],
          affectedConnections: [],
          suggestedFix: 'Connect components to create a complete path from the battery\'s positive terminal to its negative terminal.',
          visualHighlight: {
            type: 'component',
            targets: [battery.id],
            color: '#ff8800',
            style: 'dashed'
          }
        });
      }
    }

    return errors;
  }

  /**
   * Check for missing power sources
   */
  private checkForPowerSources(components: IElectricalComponent[]): CircuitError[] {
    const errors: CircuitError[] = [];
    const powerSources = components.filter(c => c.type === 'battery');

    if (powerSources.length === 0 && components.length > 0) {
      errors.push({
        id: this.generateErrorId(),
        type: 'no_power_source',
        severity: 'error',
        message: 'No power source found in circuit',
        educationalExplanation:
          'Every electrical circuit needs a power source (like a battery) to provide the energy that pushes electrons through the circuit. ' +
          'Without a power source, there is no voltage difference to drive current flow, so the circuit cannot function.',
        affectedComponents: [],
        affectedConnections: [],
        suggestedFix: 'Add a battery or other power source to your circuit.',
        visualHighlight: {
          type: 'area',
          targets: [],
          color: '#ff0000',
          style: 'dashed'
        }
      });
    }

    return errors;
  }

  /**
   * Check for disconnected components
   */
  private checkForDisconnectedComponents(
    components: IElectricalComponent[],
    connections: Connection[]
  ): CircuitError[] {
    const warnings: CircuitError[] = [];
    
    // Find components that are not connected to anything
    const connectedComponents = new Set<string>();
    for (const connection of connections) {
      connectedComponents.add(connection.fromComponent);
      connectedComponents.add(connection.toComponent);
    }

    for (const component of components) {
      if (!connectedComponents.has(component.id) && component.type !== 'wire') {
        warnings.push({
          id: this.generateErrorId(),
          type: 'disconnected_component',
          severity: 'warning',
          message: `Component ${component.id} is not connected to the circuit`,
          educationalExplanation:
            'This component is not connected to any other components in the circuit. Disconnected components cannot affect ' +
            'the circuit\'s behavior because electricity cannot flow through them. In a real circuit, this would be like ' +
            'having a component sitting on the table next to your circuit but not wired in.',
          affectedComponents: [component.id],
          affectedConnections: [],
          suggestedFix: 'Connect this component to other components using wires.',
          visualHighlight: {
            type: 'component',
            targets: [component.id],
            color: '#ffaa00',
            style: 'dashed'
          }
        });
      }
    }

    return warnings;
  }

  /**
   * Check for invalid connections between components
   */
  private checkForInvalidConnections(
    components: IElectricalComponent[],
    connections: Connection[]
  ): CircuitError[] {
    const errors: CircuitError[] = [];
    const componentMap = new Map<string, IElectricalComponent>();
    
    for (const component of components) {
      componentMap.set(component.id, component);
    }

    for (const connection of connections) {
      const fromComponent = componentMap.get(connection.fromComponent);
      const toComponent = componentMap.get(connection.toComponent);

      if (!fromComponent || !toComponent) {
        errors.push({
          id: this.generateErrorId(),
          type: 'invalid_connection',
          severity: 'error',
          message: `Invalid connection ${connection.id}: Component not found`,
          educationalExplanation:
            'This connection references a component that doesn\'t exist in the circuit. This is usually a software error ' +
            'that occurs when components are deleted but their connections remain.',
          affectedComponents: [connection.fromComponent, connection.toComponent].filter(Boolean),
          affectedConnections: [connection.id],
          suggestedFix: 'Remove this invalid connection or restore the missing component.'
        });
        continue;
      }

      // Check terminal compatibility
      const fromTerminal = fromComponent.getTerminals().find(t => t.id === connection.fromTerminal);
      const toTerminal = toComponent.getTerminals().find(t => t.id === connection.toTerminal);

      if (!fromTerminal || !toTerminal) {
        errors.push({
          id: this.generateErrorId(),
          type: 'invalid_connection',
          severity: 'error',
          message: `Invalid connection ${connection.id}: Terminal not found`,
          educationalExplanation:
            'This connection references a terminal that doesn\'t exist on the component. Each component has specific ' +
            'connection points (terminals) where wires can be attached.',
          affectedComponents: [connection.fromComponent, connection.toComponent],
          affectedConnections: [connection.id],
          suggestedFix: 'Reconnect the components using valid terminals.'
        });
      }
    }

    return errors;
  }

  /**
   * Check for component overloads (excessive current)
   */
  private checkForComponentOverloads(
    components: IElectricalComponent[],
    connections: Connection[]
  ): CircuitError[] {
    const warnings: CircuitError[] = [];
    
    // Calculate approximate current through each component
    const batteries = components.filter(c => c.type === 'battery') as Battery[];
    const leds = components.filter(c => c.type === 'led') as LED[];

    for (const battery of batteries) {
      const totalVoltage = battery.getVoltage();
      const totalResistance = this.calculateTotalCircuitResistance(components, connections);
      
      if (totalResistance > 0) {
        const current = totalVoltage / totalResistance;
        
        // Check LED current limits
        for (const led of leds) {
          const maxLEDCurrent = 0.02; // 20mA typical maximum
          if (current > maxLEDCurrent) {
            warnings.push({
              id: this.generateErrorId(),
              type: 'component_overload',
              severity: 'warning',
              message: `LED ${led.id} may be receiving excessive current (${(current * 1000).toFixed(1)}mA)`,
              educationalExplanation:
                'LEDs have a maximum current rating, typically around 20mA for standard LEDs. Exceeding this current ' +
                'can damage the LED by causing it to overheat. In real circuits, this could burn out the LED permanently.',
              affectedComponents: [led.id],
              affectedConnections: [],
              suggestedFix: 'Add a current-limiting resistor in series with the LED to reduce the current.',
              visualHighlight: {
                type: 'component',
                targets: [led.id],
                color: '#ff8800',
                style: 'pulsing'
              }
            });
          }
        }
      }
    }

    return warnings;
  }

  /**
   * Check for reverse polarity connections (especially for LEDs)
   */
  private checkForReversePolarity(
    components: IElectricalComponent[],
    connections: Connection[]
  ): CircuitError[] {
    const warnings: CircuitError[] = [];
    const leds = components.filter(c => c.type === 'led') as LED[];

    for (const led of leds) {
      // Find connections to LED terminals
      const anodeConnections = connections.filter(c => 
        (c.fromComponent === led.id && c.fromTerminal === 'anode') ||
        (c.toComponent === led.id && c.toTerminal === 'anode')
      );
      
      const cathodeConnections = connections.filter(c => 
        (c.fromComponent === led.id && c.fromTerminal === 'cathode') ||
        (c.toComponent === led.id && c.toTerminal === 'cathode')
      );

      // Check if LED is connected backwards to a battery
      for (const anodeConn of anodeConnections) {
        const otherComponent = anodeConn.fromComponent === led.id ? 
          anodeConn.toComponent : anodeConn.fromComponent;
        const otherTerminal = anodeConn.fromComponent === led.id ? 
          anodeConn.toTerminal : anodeConn.fromTerminal;
        
        const component = components.find(c => c.id === otherComponent);
        if (component?.type === 'battery' && otherTerminal === 'negative') {
          warnings.push({
            id: this.generateErrorId(),
            type: 'reverse_polarity',
            severity: 'warning',
            message: `LED ${led.id} may be connected with reverse polarity`,
            educationalExplanation:
              'LEDs are polarized components, meaning they only allow current to flow in one direction. The anode (positive terminal) ' +
              'should connect toward the positive side of the circuit, and the cathode (negative terminal) should connect toward ' +
              'the negative side. When connected backwards, the LED will not light up.',
            affectedComponents: [led.id, otherComponent],
            affectedConnections: [anodeConn.id],
            suggestedFix: 'Check the LED polarity and reconnect it with the anode toward positive and cathode toward negative.',
            visualHighlight: {
              type: 'component',
              targets: [led.id],
              color: '#ff8800',
              style: 'dashed'
            }
          });
        }
      }
    }

    return warnings;
  }

  /**
   * Check for missing current limiting resistors with LEDs
   */
  private checkForMissingCurrentLimiting(
    components: IElectricalComponent[],
    connections: Connection[]
  ): CircuitError[] {
    const warnings: CircuitError[] = [];
    const leds = components.filter(c => c.type === 'led') as LED[];
    const resistors = components.filter(c => c.type === 'resistor') as Resistor[];

    for (const led of leds) {
      // Check if LED is in series with a resistor
      const hasSeriesResistor = this.isComponentInSeriesWith(led.id, resistors.map(r => r.id), connections);
      
      if (!hasSeriesResistor) {
        warnings.push({
          id: this.generateErrorId(),
          type: 'missing_current_limiting',
          severity: 'warning',
          message: `LED ${led.id} does not have a current-limiting resistor`,
          educationalExplanation:
            'LEDs should typically be used with a current-limiting resistor to prevent damage from excessive current. ' +
            'Without a resistor, the LED may draw too much current and burn out. The resistor limits the current to a safe level ' +
            'while still allowing the LED to light up properly.',
          affectedComponents: [led.id],
          affectedConnections: [],
          suggestedFix: 'Add a resistor in series with the LED to limit the current to a safe level (typically 220-1000 ohms).',
          visualHighlight: {
            type: 'component',
            targets: [led.id],
            color: '#ffaa00',
            style: 'solid'
          }
        });
      }
    }

    return warnings;
  }

  /**
   * Check for floating nodes (nodes with only one connection)
   */
  private checkForFloatingNodes(
    components: IElectricalComponent[],
    connections: Connection[]
  ): CircuitError[] {
    const warnings: CircuitError[] = [];
    
    // Build node connection count
    const nodeConnections = new Map<string, number>();
    
    for (const connection of connections) {
      const fromKey = `${connection.fromComponent}:${connection.fromTerminal}`;
      const toKey = `${connection.toComponent}:${connection.toTerminal}`;
      
      nodeConnections.set(fromKey, (nodeConnections.get(fromKey) || 0) + 1);
      nodeConnections.set(toKey, (nodeConnections.get(toKey) || 0) + 1);
    }

    // Find nodes with only one connection
    for (const [nodeKey, connectionCount] of nodeConnections) {
      if (connectionCount === 1) {
        const [componentId, terminalId] = nodeKey.split(':');
        const component = components.find(c => c.id === componentId);
        
        if (component && component.type !== 'wire') {
          warnings.push({
            id: this.generateErrorId(),
            type: 'floating_node',
            severity: 'info',
            message: `Component ${componentId} has a floating terminal (${terminalId})`,
            educationalExplanation:
              'A floating node is a connection point that is only connected to one other point. This usually means ' +
              'the component has an unused terminal, which is often normal but worth noting. In some cases, it might ' +
              'indicate an incomplete connection.',
            affectedComponents: [componentId],
            affectedConnections: [],
            suggestedFix: 'This may be normal, but verify that all necessary connections are made.'
          });
        }
      }
    }

    return warnings;
  }

  /**
   * Check for duplicate connections
   */
  private checkForDuplicateConnections(connections: Connection[]): CircuitError[] {
    const errors: CircuitError[] = [];
    const connectionMap = new Map<string, Connection[]>();

    // Group connections by their endpoints
    for (const connection of connections) {
      const key1 = `${connection.fromComponent}:${connection.fromTerminal}-${connection.toComponent}:${connection.toTerminal}`;
      const key2 = `${connection.toComponent}:${connection.toTerminal}-${connection.fromComponent}:${connection.fromTerminal}`;
      
      if (!connectionMap.has(key1)) {
        connectionMap.set(key1, []);
      }
      if (!connectionMap.has(key2)) {
        connectionMap.set(key2, []);
      }
      
      connectionMap.get(key1)!.push(connection);
      connectionMap.get(key2)!.push(connection);
    }

    // Find duplicates
    for (const [key, connectionList] of connectionMap) {
      if (connectionList.length > 1) {
        const connectionIds = connectionList.map(c => c.id);
        errors.push({
          id: this.generateErrorId(),
          type: 'duplicate_connection',
          severity: 'warning',
          message: `Duplicate connections found between the same terminals`,
          educationalExplanation:
            'Multiple wires are connected between the same two terminals. This is usually unnecessary and can make ' +
            'the circuit confusing to understand. In most cases, one connection is sufficient.',
          affectedComponents: [],
          affectedConnections: connectionIds,
          suggestedFix: 'Remove the duplicate connections, keeping only one wire between these terminals.'
        });
      }
    }

    return errors;
  }

  // Helper methods

  private findDirectPaths(
    startComponent: string,
    startTerminal: string,
    endTerminal: string,
    components: IElectricalComponent[],
    connections: Connection[],
    visited: string[]
  ): Array<{ componentId: string; connectionId?: string }[]> {
    const paths: Array<{ componentId: string; connectionId?: string }[]> = [];
    
    // Build adjacency graph for easier traversal
    const graph = this.buildConnectionGraph(connections);
    
    // Use DFS to find paths from start terminal to end terminal on same component
    const dfs = (
      currentComponent: string,
      currentTerminal: string,
      path: Array<{ componentId: string; connectionId?: string }>,
      visitedConnections: Set<string>
    ) => {
      const nodeKey = `${currentComponent}:${currentTerminal}`;
      const adjacentNodes = graph.get(nodeKey) || [];
      
      for (const { targetNode, connectionId } of adjacentNodes) {
        if (visitedConnections.has(connectionId)) continue;
        
        const [targetComponent, targetTerminal] = targetNode.split(':');
        const newPath = [...path, { componentId: targetComponent, connectionId }];
        const newVisited = new Set([...visitedConnections, connectionId]);
        
        // If we reached the target terminal on the start component
        if (targetComponent === startComponent && targetTerminal === endTerminal) {
          paths.push(newPath);
        } else if (newPath.length < 8) { // Prevent infinite loops
          // Continue exploring from other terminals of the target component
          const targetComp = components.find(c => c.id === targetComponent);
          if (targetComp) {
            const terminals = targetComp.getTerminals();
            for (const terminal of terminals) {
              if (terminal.id !== targetTerminal) {
                dfs(targetComponent, terminal.id, newPath, newVisited);
              }
            }
          }
        }
      }
    };
    
    dfs(startComponent, startTerminal, [{ componentId: startComponent }], new Set());
    return paths;
  }

  private findCompletePaths(
    batteryId: string,
    startTerminal: string,
    endTerminal: string,
    components: IElectricalComponent[],
    connections: Connection[]
  ): string[][] {
    // Build adjacency graph
    const graph = this.buildConnectionGraph(connections);
    const completePaths: string[][] = [];
    
    // Use DFS to find complete paths
    const dfs = (
      currentComponent: string,
      currentTerminal: string,
      path: string[],
      visitedConnections: Set<string>
    ) => {
      const nodeKey = `${currentComponent}:${currentTerminal}`;
      const adjacentNodes = graph.get(nodeKey) || [];
      
      for (const { targetNode, connectionId } of adjacentNodes) {
        if (visitedConnections.has(connectionId)) continue;
        
        const [targetComponent, targetTerminal] = targetNode.split(':');
        const newPath = [...path, targetComponent];
        const newVisited = new Set([...visitedConnections, connectionId]);
        
        // If we reached the target terminal on the battery
        if (targetComponent === batteryId && targetTerminal === endTerminal) {
          completePaths.push(newPath);
        } else if (newPath.length < 8 && !path.includes(targetComponent)) {
          // Continue exploring from other terminals of the target component
          const targetComp = components.find(c => c.id === targetComponent);
          if (targetComp) {
            const terminals = targetComp.getTerminals();
            for (const terminal of terminals) {
              if (terminal.id !== targetTerminal) {
                dfs(targetComponent, terminal.id, newPath, newVisited);
              }
            }
          }
        }
      }
    };
    
    dfs(batteryId, startTerminal, [batteryId], new Set());
    return completePaths;
  }

  private buildConnectionGraph(connections: Connection[]): Map<string, Array<{ targetNode: string; connectionId: string }>> {
    const graph = new Map<string, Array<{ targetNode: string; connectionId: string }>>();
    
    for (const connection of connections) {
      const fromNode = `${connection.fromComponent}:${connection.fromTerminal}`;
      const toNode = `${connection.toComponent}:${connection.toTerminal}`;
      
      // Add bidirectional edges
      if (!graph.has(fromNode)) {
        graph.set(fromNode, []);
      }
      if (!graph.has(toNode)) {
        graph.set(toNode, []);
      }
      
      graph.get(fromNode)!.push({ targetNode: toNode, connectionId: connection.id });
      graph.get(toNode)!.push({ targetNode: fromNode, connectionId: connection.id });
    }
    
    return graph;
  }

  private calculatePathResistance(
    path: Array<{ componentId: string; connectionId?: string }>,
    components: IElectricalComponent[]
  ): number {
    let totalResistance = 0;
    
    for (const pathNode of path) {
      const component = components.find(c => c.id === pathNode.componentId);
      if (component?.type === 'resistor') {
        const resistor = component as Resistor;
        totalResistance += resistor.getResistance();
      } else if (component?.type === 'wire') {
        totalResistance += 0.01; // Very small resistance for wires
      }
    }
    
    return totalResistance;
  }

  private calculateTotalCircuitResistance(
    components: IElectricalComponent[],
    connections: Connection[]
  ): number {
    const resistors = components.filter(c => c.type === 'resistor') as Resistor[];
    if (resistors.length === 0) return 0;
    
    // Simplified calculation - assume series connection
    return resistors.reduce((total, resistor) => total + resistor.getResistance(), 0);
  }

  private isComponentInSeriesWith(
    componentId: string,
    targetComponentIds: string[],
    connections: Connection[]
  ): boolean {
    // Check if the component is directly connected to any of the target components
    const componentConnections = connections.filter(c => 
      c.fromComponent === componentId || c.toComponent === componentId
    );

    for (const connection of componentConnections) {
      const otherComponent = connection.fromComponent === componentId ? 
        connection.toComponent : connection.fromComponent;
      
      if (targetComponentIds.includes(otherComponent)) {
        return true;
      }
    }

    return false;
  }

  private generateErrorId(): string {
    return `error_${++this.errorCounter}_${Date.now()}`;
  }
}