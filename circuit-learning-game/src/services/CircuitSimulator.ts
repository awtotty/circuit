// Circuit simulation engine using Kirchhoff's laws for electrical analysis

import type { Connection } from '../types';
import type { IElectricalComponent } from '../types/components';
import { Resistor, Battery, LED, Wire } from '../types/electrical-components';

export interface SimulationNode {
  id: string;
  voltage: number;
  components: string[]; // Component IDs connected to this node
  terminals: string[]; // Terminal IDs connected to this node
}

export interface SimulationResult {
  nodes: Map<string, SimulationNode>;
  componentStates: Map<string, ComponentState>;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ComponentState {
  componentId: string;
  voltage: number;
  current: number;
  power: number;
  isActive: boolean;
  additionalProperties?: Record<string, any>;
}

export interface CircuitEquation {
  coefficients: number[];
  constant: number;
  nodeIds: string[];
}

export class CircuitSimulator {
  private tolerance = 1e-9; // Numerical tolerance for calculations
  private maxIterations = 100; // Maximum iterations for iterative solving

  /**
   * Simulate the complete circuit
   */
  public simulate(
    components: IElectricalComponent[],
    connections: Connection[]
  ): SimulationResult {
    const result: SimulationResult = {
      nodes: new Map(),
      componentStates: new Map(),
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // Validate connections first
      const connectionValidation = this.validateConnections(components, connections);
      if (!connectionValidation.isValid) {
        result.isValid = false;
        result.errors = connectionValidation.errors;
        result.warnings = connectionValidation.warnings;
        return result;
      }

      // Step 1: Build the circuit graph and identify nodes
      const nodes = this.buildCircuitNodes(components, connections);
      
      // Step 2: Validate the circuit
      const validation = this.validateCircuit(components, connections, nodes);
      result.warnings = [...connectionValidation.warnings, ...validation.warnings]; // Always include warnings
      
      if (!validation.isValid) {
        result.isValid = false;
        result.errors = validation.errors;
        return result;
      }

      // Step 3: Set up and solve the system of equations using nodal analysis
      const voltages = this.solveNodalAnalysis(components, connections, nodes);
      
      // Step 4: Calculate component states (current, power, etc.)
      const componentStates = this.calculateComponentStates(
        components,
        connections,
        nodes,
        voltages
      );

      // Step 5: Update component properties based on simulation results
      this.updateComponentProperties(components, componentStates);

      result.nodes = nodes;
      result.componentStates = componentStates;

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Simulation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Validate connections between components
   */
  private validateConnections(
    components: IElectricalComponent[],
    connections: Connection[]
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Create component lookup map
    const componentMap = new Map<string, IElectricalComponent>();
    for (const component of components) {
      componentMap.set(component.id, component);
    }

    // Validate each connection
    for (const connection of connections) {
      // Check if components exist
      const fromComponent = componentMap.get(connection.fromComponent);
      const toComponent = componentMap.get(connection.toComponent);

      if (!fromComponent) {
        errors.push(`Connection ${connection.id}: Component ${connection.fromComponent} not found`);
        continue;
      }

      if (!toComponent) {
        errors.push(`Connection ${connection.id}: Component ${connection.toComponent} not found`);
        continue;
      }

      // Check if terminals exist on components
      const fromTerminal = fromComponent.getTerminals().find(t => t.id === connection.fromTerminal);
      const toTerminal = toComponent.getTerminals().find(t => t.id === connection.toTerminal);

      if (!fromTerminal) {
        errors.push(`Connection ${connection.id}: Terminal ${connection.fromTerminal} not found on component ${connection.fromComponent}`);
        continue;
      }

      if (!toTerminal) {
        errors.push(`Connection ${connection.id}: Terminal ${connection.toTerminal} not found on component ${connection.toComponent}`);
        continue;
      }

      // Check terminal compatibility
      if (fromTerminal.type === 'input' && toTerminal.type === 'input') {
        warnings.push(`Connection ${connection.id}: Connecting two input terminals may not work as expected`);
      }

      if (fromTerminal.type === 'output' && toTerminal.type === 'output') {
        warnings.push(`Connection ${connection.id}: Connecting two output terminals may cause conflicts`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Build circuit nodes by analyzing component connections
   */
  private buildCircuitNodes(
    components: IElectricalComponent[],
    connections: Connection[]
  ): Map<string, SimulationNode> {
    const nodes = new Map<string, SimulationNode>();
    
    if (connections.length === 0) {
      return nodes;
    }

    // Use Union-Find to group connected terminals
    const terminalToNode = new Map<string, string>();
    const nodeGroups = new Map<string, Set<string>>();
    let nodeCounter = 0;

    // Initialize each terminal as its own group
    for (const connection of connections) {
      const fromKey = `${connection.fromComponent}:${connection.fromTerminal}`;
      const toKey = `${connection.toComponent}:${connection.toTerminal}`;
      
      if (!terminalToNode.has(fromKey)) {
        const nodeId = `node_${nodeCounter++}`;
        terminalToNode.set(fromKey, nodeId);
        nodeGroups.set(nodeId, new Set([fromKey]));
      }
      
      if (!terminalToNode.has(toKey)) {
        const nodeId = `node_${nodeCounter++}`;
        terminalToNode.set(toKey, nodeId);
        nodeGroups.set(nodeId, new Set([toKey]));
      }
    }

    // Merge connected terminals
    for (const connection of connections) {
      const fromKey = `${connection.fromComponent}:${connection.fromTerminal}`;
      const toKey = `${connection.toComponent}:${connection.toTerminal}`;
      
      const fromNodeId = terminalToNode.get(fromKey)!;
      const toNodeId = terminalToNode.get(toKey)!;
      
      if (fromNodeId !== toNodeId) {
        // Merge toNode into fromNode
        const fromGroup = nodeGroups.get(fromNodeId)!;
        const toGroup = nodeGroups.get(toNodeId)!;
        
        // Update all terminals in toGroup to point to fromNode
        for (const terminal of toGroup) {
          terminalToNode.set(terminal, fromNodeId);
          fromGroup.add(terminal);
        }
        
        // Remove the merged group
        nodeGroups.delete(toNodeId);
      }
    }

    // Create final nodes
    for (const [nodeId, terminals] of nodeGroups) {
      const componentIds = new Set<string>();
      
      for (const terminal of terminals) {
        const [componentId] = terminal.split(':');
        componentIds.add(componentId);
      }
      
      const node: SimulationNode = {
        id: nodeId,
        voltage: 0,
        components: Array.from(componentIds),
        terminals: Array.from(terminals)
      };
      
      nodes.set(nodeId, node);
    }

    // Designate ground node (node with most components, or first node)
    if (nodes.size > 0) {
      let groundNode = Array.from(nodes.values())[0];
      for (const node of nodes.values()) {
        if (node.components.length > groundNode.components.length) {
          groundNode = node;
        }
      }
      const oldId = groundNode.id;
      groundNode.id = 'ground';
      groundNode.voltage = 0;
      
      // Update the map key
      nodes.delete(oldId);
      nodes.set('ground', groundNode);
    }

    return nodes;
  }

  /**
   * Validate the circuit for common issues
   */
  private validateCircuit(
    components: IElectricalComponent[],
    connections: Connection[],
    nodes: Map<string, SimulationNode>
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for disconnected components
    const connectedComponents = new Set<string>();
    for (const connection of connections) {
      connectedComponents.add(connection.fromComponent);
      connectedComponents.add(connection.toComponent);
    }

    for (const component of components) {
      if (!connectedComponents.has(component.id) && component.type !== 'wire') {
        warnings.push(`Component ${component.id} is not connected to the circuit`);
      }
    }

    // Check for voltage sources
    const voltageSources = components.filter(c => c.type === 'battery');
    if (voltageSources.length === 0) {
      errors.push('Circuit must contain at least one voltage source (battery)');
    }

    // Check for short circuits - simplified check for direct wire connections
    for (const battery of voltageSources) {
      const batteryConnections = connections.filter(
        c => c.fromComponent === battery.id || c.toComponent === battery.id
      );
      
      // Check if battery is connected to a wire that directly connects both terminals
      for (const connection of batteryConnections) {
        const otherComponent = connection.fromComponent === battery.id ? 
          connection.toComponent : connection.fromComponent;
        
        const otherComponentObj = components.find(c => c.id === otherComponent);
        if (otherComponentObj?.type === 'wire') {
          // Check if this wire connects both battery terminals
          const wireConnections = connections.filter(
            c => c.fromComponent === otherComponent || c.toComponent === otherComponent
          );
          
          const connectsToBattery = wireConnections.filter(
            c => (c.fromComponent === battery.id || c.toComponent === battery.id)
          );
          
          if (connectsToBattery.length >= 2) {
            const terminals = connectsToBattery.map(c => 
              c.fromComponent === battery.id ? c.fromTerminal : c.toTerminal
            );
            
            if (terminals.includes('positive') && terminals.includes('negative')) {
              errors.push(`Short circuit detected: Battery ${battery.id} terminals are directly connected`);
            }
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Solve the circuit using simplified analysis for basic circuits
   */
  private solveNodalAnalysis(
    components: IElectricalComponent[],
    connections: Connection[],
    nodes: Map<string, SimulationNode>
  ): Map<string, number> {
    const voltageMap = new Map<string, number>();
    
    // Set ground voltage
    voltageMap.set('ground', 0);
    
    // For simple circuits, use direct calculation
    // Find battery and calculate voltages based on circuit topology
    const batteries = components.filter(c => c.type === 'battery') as Battery[];
    
    if (batteries.length === 0) {
      // No voltage source, all nodes at 0V
      for (const [nodeId] of nodes) {
        voltageMap.set(nodeId, 0);
      }
      return voltageMap;
    }

    // For each battery, determine which nodes it connects
    for (const battery of batteries) {
      const batteryVoltage = battery.getVoltage();
      
      // Find nodes connected to battery terminals
      const positiveNode = this.findNodeForComponentTerminal(battery.id, 'positive', nodes);
      const negativeNode = this.findNodeForComponentTerminal(battery.id, 'negative', nodes);
      
      if (positiveNode && negativeNode) {
        if (negativeNode === 'ground') {
          voltageMap.set(positiveNode, batteryVoltage);
        } else if (positiveNode === 'ground') {
          voltageMap.set(negativeNode, -batteryVoltage);
        } else {
          // Neither terminal is ground, set positive node to battery voltage
          voltageMap.set(positiveNode, batteryVoltage);
          voltageMap.set(negativeNode, 0);
        }
      }
    }

    // Set any remaining nodes to 0V
    for (const [nodeId] of nodes) {
      if (!voltageMap.has(nodeId)) {
        voltageMap.set(nodeId, 0);
      }
    }

    return voltageMap;
  }

  /**
   * Find the index of the other node connected to a component
   */
  private findOtherNodeIndex(
    componentId: string,
    currentNodeId: string,
    nonGroundNodes: SimulationNode[],
    connections: Connection[]
  ): number {
    const componentConnections = connections.filter(
      c => c.fromComponent === componentId || c.toComponent === componentId
    );

    for (const connection of componentConnections) {
      const otherComponentId = connection.fromComponent === componentId ?
        connection.toComponent : connection.fromComponent;
      
      // Find which node contains this other component
      for (let i = 0; i < nonGroundNodes.length; i++) {
        const node = nonGroundNodes[i];
        if (node.id !== currentNodeId && node.components.includes(otherComponentId)) {
          return i;
        }
      }
    }

    return -1; // Connected to ground or not found
  }

  /**
   * Check if a node is connected to a specific terminal of a component
   */
  private isNodeConnectedToTerminal(
    node: SimulationNode,
    componentId: string,
    terminalId: string,
    connections: Connection[]
  ): boolean {
    const terminalKey = `${componentId}:${terminalId}`;
    return node.terminals.includes(terminalKey);
  }

  /**
   * Solve linear system using Gaussian elimination
   */
  private solveLinearSystem(A: number[][], b: number[]): number[] {
    const n = A.length;
    const augmented = A.map((row, i) => [...row, b[i]]);

    // Forward elimination
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }

      // Swap rows
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

      // Make all rows below this one 0 in current column
      for (let k = i + 1; k < n; k++) {
        const factor = augmented[k][i] / augmented[i][i];
        for (let j = i; j <= n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }

    // Back substitution
    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = augmented[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= augmented[i][j] * x[j];
      }
      x[i] /= augmented[i][i];
    }

    return x;
  }

  /**
   * Calculate component states based on node voltages
   */
  private calculateComponentStates(
    components: IElectricalComponent[],
    connections: Connection[],
    nodes: Map<string, SimulationNode>,
    voltages: Map<string, number>
  ): Map<string, ComponentState> {
    const componentStates = new Map<string, ComponentState>();

    // First, calculate total circuit resistance and current for simple series circuits
    const batteries = components.filter(c => c.type === 'battery') as Battery[];
    const resistors = components.filter(c => c.type === 'resistor') as Resistor[];
    const leds = components.filter(c => c.type === 'led') as LED[];

    for (const component of components) {
      const state: ComponentState = {
        componentId: component.id,
        voltage: 0,
        current: 0,
        power: 0,
        isActive: false,
        additionalProperties: {}
      };

      if (component.type === 'resistor') {
        const resistor = component as Resistor;
        const resistance = resistor.getResistance();
        
        // For parallel resistors, each gets the full voltage but current divides
        const isParallel = this.areResistorsInParallel(resistors, connections);
        
        if (isParallel && resistors.length > 1) {
          // In parallel: each resistor gets full battery voltage
          const totalVoltage = batteries.reduce((sum, b) => sum + b.getVoltage(), 0);
          state.voltage = totalVoltage;
          state.current = totalVoltage / resistance;
        } else {
          // In series: current is same, voltage divides
          const circuitCurrent = this.calculateCircuitCurrent(components, connections);
          state.current = circuitCurrent;
          state.voltage = circuitCurrent * resistance;
        }
        
        state.power = state.current * state.voltage;
        state.isActive = state.current > this.tolerance;
        
      } else if (component.type === 'battery') {
        const battery = component as Battery;
        state.voltage = battery.getVoltage();
        
        // Calculate current through the circuit
        const circuitCurrent = this.calculateCircuitCurrent(components, connections);
        state.current = circuitCurrent;
        state.power = state.current * state.voltage;
        state.isActive = true;
        
      } else if (component.type === 'led') {
        const led = component as LED;
        const forwardVoltage = led.getForwardVoltage();
        
        // Calculate circuit current considering LED forward voltage
        const circuitCurrent = this.calculateCircuitCurrent(components, connections);
        
        // Check if LED has sufficient voltage to turn on
        const totalVoltage = batteries.reduce((sum, b) => sum + b.getVoltage(), 0);
        const otherResistance = resistors.reduce((sum, r) => sum + r.getResistance(), 0);
        const voltageAcrossLED = totalVoltage - (circuitCurrent * otherResistance);
        
        if (voltageAcrossLED >= forwardVoltage && circuitCurrent > this.tolerance) {
          state.current = circuitCurrent;
          state.voltage = voltageAcrossLED;
          state.power = state.current * state.voltage;
          state.isActive = true;
          
          // Calculate brightness (0-1 scale)
          const maxCurrent = 0.02; // 20mA typical LED current
          const brightness = Math.min(state.current / maxCurrent, 1);
          state.additionalProperties = { brightness };
        } else {
          state.isActive = false;
          state.additionalProperties = { brightness: 0 };
        }
      }

      componentStates.set(component.id, state);
    }

    return componentStates;
  }

  /**
   * Calculate the total current flowing through a circuit (handles both series and parallel)
   */
  private calculateCircuitCurrent(
    components: IElectricalComponent[],
    connections: Connection[]
  ): number {
    const batteries = components.filter(c => c.type === 'battery') as Battery[];
    const resistors = components.filter(c => c.type === 'resistor') as Resistor[];
    const leds = components.filter(c => c.type === 'led') as LED[];

    if (batteries.length === 0) {
      return 0;
    }

    // Calculate total voltage
    const totalVoltage = batteries.reduce((sum, battery) => sum + battery.getVoltage(), 0);

    // For parallel resistors, we need to calculate equivalent resistance differently
    // Check if resistors are in parallel by seeing if they share the same nodes
    const isParallel = this.areResistorsInParallel(resistors, connections);
    
    let totalResistance = 0;
    
    if (isParallel && resistors.length > 1) {
      // Calculate parallel resistance: 1/Rtotal = 1/R1 + 1/R2 + ...
      let reciprocalSum = 0;
      for (const resistor of resistors) {
        reciprocalSum += 1 / resistor.getResistance();
      }
      totalResistance = 1 / reciprocalSum;
    } else {
      // Series resistance: Rtotal = R1 + R2 + ...
      totalResistance = resistors.reduce((sum, resistor) => sum + resistor.getResistance(), 0);
    }
    
    // Add LED resistance if forward biased
    for (const led of leds) {
      const forwardVoltage = led.getForwardVoltage();
      if (totalVoltage >= forwardVoltage) {
        totalResistance += 100; // Simplified LED resistance when conducting
      } else {
        // LED not conducting, infinite resistance (open circuit)
        return 0;
      }
    }

    // Avoid division by zero
    if (totalResistance <= 0) {
      return 0;
    }

    // Calculate effective voltage (subtract LED forward voltage drops)
    let effectiveVoltage = totalVoltage;
    for (const led of leds) {
      const forwardVoltage = led.getForwardVoltage();
      if (totalVoltage >= forwardVoltage) {
        effectiveVoltage -= forwardVoltage;
      }
    }

    // Ohm's law: I = V / R
    return Math.max(0, effectiveVoltage / totalResistance);
  }

  /**
   * Check if resistors are connected in parallel
   */
  private areResistorsInParallel(
    resistors: Resistor[],
    connections: Connection[]
  ): boolean {
    if (resistors.length < 2) return false;

    // For a simple check, see if any two resistors share the same connection points
    // In parallel, resistors would connect to the same two nodes
    for (let i = 0; i < resistors.length; i++) {
      for (let j = i + 1; j < resistors.length; j++) {
        const resistor1 = resistors[i];
        const resistor2 = resistors[j];
        
        // Get connections for each resistor
        const r1Connections = connections.filter(c => 
          c.fromComponent === resistor1.id || c.toComponent === resistor1.id
        );
        const r2Connections = connections.filter(c => 
          c.fromComponent === resistor2.id || c.toComponent === resistor2.id
        );
        
        // Check if they connect to the same other components (indicating parallel)
        const r1OtherComponents = new Set<string>();
        const r2OtherComponents = new Set<string>();
        
        for (const conn of r1Connections) {
          const otherComponent = conn.fromComponent === resistor1.id ? conn.toComponent : conn.fromComponent;
          r1OtherComponents.add(otherComponent);
        }
        
        for (const conn of r2Connections) {
          const otherComponent = conn.fromComponent === resistor2.id ? conn.toComponent : conn.fromComponent;
          r2OtherComponents.add(otherComponent);
        }
        
        // If they connect to the same components, they're likely in parallel
        if (r1OtherComponents.size === r2OtherComponents.size && 
            Array.from(r1OtherComponents).every(comp => r2OtherComponents.has(comp))) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Find nodes connected to a specific component
   */
  private findComponentNodes(
    componentId: string,
    nodes: Map<string, SimulationNode>,
    connections: Connection[]
  ): string[] {
    const connectedNodes: string[] = [];

    for (const [nodeId, node] of nodes) {
      if (node.components.includes(componentId)) {
        connectedNodes.push(nodeId);
      }
    }

    return connectedNodes;
  }

  /**
   * Find the node that contains a specific component terminal
   */
  private findNodeForComponentTerminal(
    componentId: string,
    terminalId: string,
    nodes: Map<string, SimulationNode>
  ): string | null {
    const terminalKey = `${componentId}:${terminalId}`;
    
    for (const [nodeId, node] of nodes) {
      if (node.terminals.includes(terminalKey)) {
        return nodeId;
      }
    }
    
    return null;
  }

  /**
   * Update component properties based on simulation results
   */
  private updateComponentProperties(
    components: IElectricalComponent[],
    componentStates: Map<string, ComponentState>
  ): void {
    for (const component of components) {
      const state = componentStates.get(component.id);
      if (!state) continue;

      if (component.type === 'led') {
        const led = component as LED;
        led.setLit(state.isActive);
        if (state.additionalProperties?.brightness !== undefined) {
          led.setBrightness(state.additionalProperties.brightness);
        }
      }
    }
  }
}