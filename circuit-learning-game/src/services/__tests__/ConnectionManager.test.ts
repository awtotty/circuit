// Tests for ConnectionManager

import { ConnectionManager } from '../ConnectionManager';
import { Resistor, Battery, LED } from '../../types/electrical-components';
import type { IElectricalComponent } from '../../types/components';
import type { Position } from '../../types';

describe('ConnectionManager', () => {
  let connectionManager: ConnectionManager;
  let components: IElectricalComponent[];
  let resistor: Resistor;
  let battery: Battery;
  let led: LED;

  beforeEach(() => {
    connectionManager = new ConnectionManager();
    
    // Create test components
    resistor = new Resistor('resistor1', { x: 100, y: 100 }, 1000);
    battery = new Battery('battery1', { x: 200, y: 100 }, 9);
    led = new LED('led1', { x: 300, y: 100 }, 2.0);
    
    components = [resistor, battery, led];
  });

  describe('findTerminalAtPosition', () => {
    it('should find terminal at exact position', () => {
      const terminal = resistor.terminals[0];
      const result = connectionManager.findTerminalAtPosition(components, terminal.position);
      
      expect(result).not.toBeNull();
      expect(result?.componentId).toBe('resistor1');
      expect(result?.terminalId).toBe(terminal.id);
    });

    it('should find terminal within tolerance', () => {
      const terminal = resistor.terminals[0];
      const nearbyPosition: Position = {
        x: terminal.position.x + 5,
        y: terminal.position.y + 5
      };
      
      const result = connectionManager.findTerminalAtPosition(components, nearbyPosition);
      
      expect(result).not.toBeNull();
      expect(result?.componentId).toBe('resistor1');
    });

    it('should return null when no terminal is found', () => {
      const farPosition: Position = { x: 500, y: 500 };
      const result = connectionManager.findTerminalAtPosition(components, farPosition);
      
      expect(result).toBeNull();
    });
  });

  describe('wire drawing state', () => {
    it('should start wire drawing correctly', () => {
      const terminal = resistor.terminals[0];
      const connectionPoint = {
        componentId: 'resistor1',
        terminalId: terminal.id,
        position: terminal.position,
        terminal
      };

      connectionManager.startWireDrawing(connectionPoint);
      const state = connectionManager.getWireDrawingState();

      expect(state.isDrawing).toBe(true);
      expect(state.startPoint).toEqual(connectionPoint);
      expect(state.previewPath).toHaveLength(1);
    });

    it('should update wire drawing position', () => {
      const terminal = resistor.terminals[0];
      const connectionPoint = {
        componentId: 'resistor1',
        terminalId: terminal.id,
        position: terminal.position,
        terminal
      };

      connectionManager.startWireDrawing(connectionPoint);
      
      const mousePos: Position = { x: 150, y: 150 };
      connectionManager.updateWireDrawing(mousePos);
      
      const state = connectionManager.getWireDrawingState();
      expect(state.currentMousePosition).toEqual(mousePos);
      expect(state.previewPath).toHaveLength(2);
    });

    it('should cancel wire drawing', () => {
      const terminal = resistor.terminals[0];
      const connectionPoint = {
        componentId: 'resistor1',
        terminalId: terminal.id,
        position: terminal.position,
        terminal
      };

      connectionManager.startWireDrawing(connectionPoint);
      connectionManager.cancelWireDrawing();
      
      const state = connectionManager.getWireDrawingState();
      expect(state.isDrawing).toBe(false);
      expect(state.startPoint).toBeNull();
    });
  });

  describe('connection validation', () => {
    it('should validate valid connection between battery and resistor', () => {
      const batteryTerminal = battery.terminals.find(t => t.type === 'output')!;
      const resistorTerminal = resistor.terminals[0];

      const startPoint = {
        componentId: 'battery1',
        terminalId: batteryTerminal.id,
        position: batteryTerminal.position,
        terminal: batteryTerminal
      };

      const endPoint = {
        componentId: 'resistor1',
        terminalId: resistorTerminal.id,
        position: resistorTerminal.position,
        terminal: resistorTerminal
      };

      const result = connectionManager.validateConnection(startPoint, endPoint, components);
      expect(result.isValid).toBe(true);
    });

    it('should reject connection to same component', () => {
      const terminal1 = resistor.terminals[0];
      const terminal2 = resistor.terminals[1];

      const startPoint = {
        componentId: 'resistor1',
        terminalId: terminal1.id,
        position: terminal1.position,
        terminal: terminal1
      };

      const endPoint = {
        componentId: 'resistor1',
        terminalId: terminal2.id,
        position: terminal2.position,
        terminal: terminal2
      };

      const result = connectionManager.validateConnection(startPoint, endPoint, components);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Cannot connect a component to itself');
    });

    it('should reject connection between two output terminals', () => {
      const battery1 = new Battery('battery2', { x: 400, y: 100 }, 9);
      components.push(battery1);

      const battery1Output = battery.terminals.find(t => t.type === 'output')!;
      const battery2Output = battery1.terminals.find(t => t.type === 'output')!;

      const startPoint = {
        componentId: 'battery1',
        terminalId: battery1Output.id,
        position: battery1Output.position,
        terminal: battery1Output
      };

      const endPoint = {
        componentId: 'battery2',
        terminalId: battery2Output.id,
        position: battery2Output.position,
        terminal: battery2Output
      };

      const result = connectionManager.validateConnection(startPoint, endPoint, components);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Cannot connect two output terminals');
    });

    it('should reject connection between two input terminals', () => {
      const battery1Input = battery.terminals.find(t => t.type === 'input')!;
      const ledInput = led.terminals.find(t => t.type === 'input')!;

      const startPoint = {
        componentId: 'battery1',
        terminalId: battery1Input.id,
        position: battery1Input.position,
        terminal: battery1Input
      };

      const endPoint = {
        componentId: 'led1',
        terminalId: ledInput.id,
        position: ledInput.position,
        terminal: ledInput
      };

      const result = connectionManager.validateConnection(startPoint, endPoint, components);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Cannot connect two input terminals');
    });

    it('should reject connection to already connected terminal', () => {
      const batteryOutput = battery.terminals.find(t => t.type === 'output')!;
      const resistorTerminal = resistor.terminals[0];

      // Mark terminal as already connected
      resistorTerminal.connected = true;

      const startPoint = {
        componentId: 'battery1',
        terminalId: batteryOutput.id,
        position: batteryOutput.position,
        terminal: batteryOutput
      };

      const endPoint = {
        componentId: 'resistor1',
        terminalId: resistorTerminal.id,
        position: resistorTerminal.position,
        terminal: resistorTerminal
      };

      const result = connectionManager.validateConnection(startPoint, endPoint, components);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('End terminal is already connected');
    });
  });

  describe('connection management', () => {
    it('should create valid connection', () => {
      const batteryOutput = battery.terminals.find(t => t.type === 'output')!;
      const resistorTerminal = resistor.terminals[0];

      const startPoint = {
        componentId: 'battery1',
        terminalId: batteryOutput.id,
        position: batteryOutput.position,
        terminal: batteryOutput
      };

      const endPoint = {
        componentId: 'resistor1',
        terminalId: resistorTerminal.id,
        position: resistorTerminal.position,
        terminal: resistorTerminal
      };

      connectionManager.startWireDrawing(startPoint);
      const connection = connectionManager.completeWireDrawing(endPoint, components);

      expect(connection).not.toBeNull();
      expect(connection?.fromComponent).toBe('battery1');
      expect(connection?.toComponent).toBe('resistor1');
      expect(batteryOutput.connected).toBe(true);
      expect(resistorTerminal.connected).toBe(true);
    });

    it('should remove connection correctly', () => {
      const batteryOutput = battery.terminals.find(t => t.type === 'output')!;
      const resistorTerminal = resistor.terminals[0];

      const startPoint = {
        componentId: 'battery1',
        terminalId: batteryOutput.id,
        position: batteryOutput.position,
        terminal: batteryOutput
      };

      const endPoint = {
        componentId: 'resistor1',
        terminalId: resistorTerminal.id,
        position: resistorTerminal.position,
        terminal: resistorTerminal
      };

      connectionManager.startWireDrawing(startPoint);
      const connection = connectionManager.completeWireDrawing(endPoint, components);

      expect(connection).not.toBeNull();
      
      const removed = connectionManager.removeConnection(connection!.id, components);
      expect(removed).toBe(true);
      expect(batteryOutput.connected).toBe(false);
      expect(resistorTerminal.connected).toBe(false);
    });

    it('should get component connections', () => {
      const batteryOutput = battery.terminals.find(t => t.type === 'output')!;
      const resistorTerminal = resistor.terminals[0];

      const startPoint = {
        componentId: 'battery1',
        terminalId: batteryOutput.id,
        position: batteryOutput.position,
        terminal: batteryOutput
      };

      const endPoint = {
        componentId: 'resistor1',
        terminalId: resistorTerminal.id,
        position: resistorTerminal.position,
        terminal: resistorTerminal
      };

      connectionManager.startWireDrawing(startPoint);
      const connection = connectionManager.completeWireDrawing(endPoint, components);

      const batteryConnections = connectionManager.getComponentConnections('battery1');
      const resistorConnections = connectionManager.getComponentConnections('resistor1');

      expect(batteryConnections).toHaveLength(1);
      expect(resistorConnections).toHaveLength(1);
      expect(batteryConnections[0].id).toBe(connection?.id);
    });

    it('should clear all connections', () => {
      const batteryOutput = battery.terminals.find(t => t.type === 'output')!;
      const resistorTerminal = resistor.terminals[0];

      const startPoint = {
        componentId: 'battery1',
        terminalId: batteryOutput.id,
        position: batteryOutput.position,
        terminal: batteryOutput
      };

      const endPoint = {
        componentId: 'resistor1',
        terminalId: resistorTerminal.id,
        position: resistorTerminal.position,
        terminal: resistorTerminal
      };

      connectionManager.startWireDrawing(startPoint);
      connectionManager.completeWireDrawing(endPoint, components);

      connectionManager.clearAllConnections(components);

      expect(connectionManager.getConnections()).toHaveLength(0);
      expect(batteryOutput.connected).toBe(false);
      expect(resistorTerminal.connected).toBe(false);
    });
  });
});