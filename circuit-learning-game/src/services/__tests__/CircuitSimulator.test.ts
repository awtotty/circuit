// Comprehensive tests for CircuitSimulator electrical calculations

import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitSimulator } from '../CircuitSimulator';
import { Resistor, Battery, LED, Wire } from '../../types/electrical-components';
import type { Connection } from '../../types';
import type { IElectricalComponent } from '../../types/components';

describe('CircuitSimulator', () => {
  let simulator: CircuitSimulator;

  beforeEach(() => {
    simulator = new CircuitSimulator();
  });

  describe('Basic Circuit Analysis', () => {
    it('should simulate a simple resistor-battery circuit', () => {
      // Create components: Battery (9V) -> Resistor (1000Ω)
      const battery = new Battery('battery1', { x: 0, y: 0 }, 9);
      const resistor = new Resistor('resistor1', { x: 100, y: 0 }, 1000);

      const components: IElectricalComponent[] = [battery, resistor];
      const connections: Connection[] = [
        {
          id: 'conn1',
          fromComponent: 'battery1',
          fromTerminal: 'positive',
          toComponent: 'resistor1',
          toTerminal: 'terminal1'
        },
        {
          id: 'conn2',
          fromComponent: 'resistor1',
          fromTerminal: 'terminal2',
          toComponent: 'battery1',
          toTerminal: 'negative'
        }
      ];

      const result = simulator.simulate(components, connections);
      
      console.log('Debug - Result:', {
        isValid: result.isValid,
        errors: result.errors,
        warnings: result.warnings,
        nodesCount: result.nodes.size,
        componentStatesCount: result.componentStates.size
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Check resistor state
      const resistorState = result.componentStates.get('resistor1');
      expect(resistorState).toBeDefined();
      expect(resistorState!.voltage).toBeCloseTo(9, 1); // Should have full battery voltage
      expect(resistorState!.current).toBeCloseTo(0.009, 3); // I = V/R = 9/1000 = 0.009A
      expect(resistorState!.power).toBeCloseTo(0.081, 3); // P = V*I = 9*0.009 = 0.081W
      expect(resistorState!.isActive).toBe(true);
    });

    it('should handle series resistor circuits', () => {
      // Create components: Battery (12V) -> R1 (500Ω) -> R2 (1000Ω)
      const battery = new Battery('battery1', { x: 0, y: 0 }, 12);
      const resistor1 = new Resistor('resistor1', { x: 100, y: 0 }, 500);
      const resistor2 = new Resistor('resistor2', { x: 200, y: 0 }, 1000);

      const components: IElectricalComponent[] = [battery, resistor1, resistor2];
      const connections: Connection[] = [
        {
          id: 'conn1',
          fromComponent: 'battery1',
          fromTerminal: 'positive',
          toComponent: 'resistor1',
          toTerminal: 'terminal1'
        },
        {
          id: 'conn2',
          fromComponent: 'resistor1',
          fromTerminal: 'terminal2',
          toComponent: 'resistor2',
          toTerminal: 'terminal1'
        },
        {
          id: 'conn3',
          fromComponent: 'resistor2',
          fromTerminal: 'terminal2',
          toComponent: 'battery1',
          toTerminal: 'negative'
        }
      ];

      const result = simulator.simulate(components, connections);

      expect(result.isValid).toBe(true);

      // Total resistance = 500 + 1000 = 1500Ω
      // Total current = 12V / 1500Ω = 0.008A
      const resistor1State = result.componentStates.get('resistor1');
      const resistor2State = result.componentStates.get('resistor2');

      expect(resistor1State!.current).toBeCloseTo(0.008, 3);
      expect(resistor2State!.current).toBeCloseTo(0.008, 3);

      // Voltage drops: V1 = I*R1 = 0.008*500 = 4V, V2 = I*R2 = 0.008*1000 = 8V
      expect(resistor1State!.voltage).toBeCloseTo(4, 1);
      expect(resistor2State!.voltage).toBeCloseTo(8, 1);
    });

    it('should simulate LED circuits correctly', () => {
      // Create components: Battery (5V) -> Resistor (150Ω) -> LED (2V forward voltage)
      const battery = new Battery('battery1', { x: 0, y: 0 }, 5);
      const resistor = new Resistor('resistor1', { x: 100, y: 0 }, 150);
      const led = new LED('led1', { x: 200, y: 0 }, 2.0);

      const components: IElectricalComponent[] = [battery, resistor, led];
      const connections: Connection[] = [
        {
          id: 'conn1',
          fromComponent: 'battery1',
          fromTerminal: 'positive',
          toComponent: 'resistor1',
          toTerminal: 'terminal1'
        },
        {
          id: 'conn2',
          fromComponent: 'resistor1',
          fromTerminal: 'terminal2',
          toComponent: 'led1',
          toTerminal: 'anode'
        },
        {
          id: 'conn3',
          fromComponent: 'led1',
          fromTerminal: 'cathode',
          toComponent: 'battery1',
          toTerminal: 'negative'
        }
      ];

      const result = simulator.simulate(components, connections);

      expect(result.isValid).toBe(true);

      const ledState = result.componentStates.get('led1');
      expect(ledState).toBeDefined();
      expect(ledState!.isActive).toBe(true); // LED should be lit
      expect(ledState!.additionalProperties?.brightness).toBeGreaterThan(0);

      // Check that LED component properties are updated
      expect(led.isLit()).toBe(true);
      expect(led.getBrightness()).toBeGreaterThan(0);
    });
  });

  describe('Circuit Validation', () => {
    it('should detect circuits without voltage sources', () => {
      const resistor1 = new Resistor('resistor1', { x: 0, y: 0 }, 1000);
      const resistor2 = new Resistor('resistor2', { x: 100, y: 0 }, 2000);

      const components: IElectricalComponent[] = [resistor1, resistor2];
      const connections: Connection[] = [
        {
          id: 'conn1',
          fromComponent: 'resistor1',
          fromTerminal: 'terminal1',
          toComponent: 'resistor2',
          toTerminal: 'terminal1'
        }
      ];

      const result = simulator.simulate(components, connections);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Circuit must contain at least one voltage source (battery)');
    });

    it('should detect short circuits', () => {
      const battery = new Battery('battery1', { x: 0, y: 0 }, 9);
      const wire = new Wire('wire1', { x: 50, y: 0 }, [{ x: 20, y: 0 }, { x: -20, y: 0 }]);

      const components: IElectricalComponent[] = [battery, wire];
      const connections: Connection[] = [
        {
          id: 'conn1',
          fromComponent: 'battery1',
          fromTerminal: 'positive',
          toComponent: 'wire1',
          toTerminal: 'start'
        },
        {
          id: 'conn2',
          fromComponent: 'wire1',
          fromTerminal: 'end',
          toComponent: 'battery1',
          toTerminal: 'negative'
        }
      ];

      const result = simulator.simulate(components, connections);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Short circuit detected'))).toBe(true);
    });

    it('should warn about disconnected components', () => {
      const battery = new Battery('battery1', { x: 0, y: 0 }, 9);
      const resistor1 = new Resistor('resistor1', { x: 100, y: 0 }, 1000);
      const resistor2 = new Resistor('resistor2', { x: 200, y: 0 }, 2000); // Disconnected

      const components: IElectricalComponent[] = [battery, resistor1, resistor2];
      const connections: Connection[] = [
        {
          id: 'conn1',
          fromComponent: 'battery1',
          fromTerminal: 'positive',
          toComponent: 'resistor1',
          toTerminal: 'terminal1'
        },
        {
          id: 'conn2',
          fromComponent: 'resistor1',
          fromTerminal: 'terminal2',
          toComponent: 'battery1',
          toTerminal: 'negative'
        }
      ];

      const result = simulator.simulate(components, connections);

      expect(result.isValid).toBe(true); // Valid but with warnings
      expect(result.warnings.some(warning => 
        warning.includes('resistor2') && warning.includes('not connected')
      )).toBe(true);
    });
  });

  describe('Node Analysis', () => {
    it('should correctly identify circuit nodes', () => {
      const battery = new Battery('battery1', { x: 0, y: 0 }, 9);
      const resistor1 = new Resistor('resistor1', { x: 100, y: 0 }, 1000);
      const resistor2 = new Resistor('resistor2', { x: 100, y: 100 }, 2000);

      const components: IElectricalComponent[] = [battery, resistor1, resistor2];
      const connections: Connection[] = [
        {
          id: 'conn1',
          fromComponent: 'battery1',
          fromTerminal: 'positive',
          toComponent: 'resistor1',
          toTerminal: 'terminal1'
        },
        {
          id: 'conn2',
          fromComponent: 'battery1',
          fromTerminal: 'positive',
          toComponent: 'resistor2',
          toTerminal: 'terminal1'
        },
        {
          id: 'conn3',
          fromComponent: 'resistor1',
          fromTerminal: 'terminal2',
          toComponent: 'battery1',
          toTerminal: 'negative'
        },
        {
          id: 'conn4',
          fromComponent: 'resistor2',
          fromTerminal: 'terminal2',
          toComponent: 'battery1',
          toTerminal: 'negative'
        }
      ];

      const result = simulator.simulate(components, connections);

      expect(result.isValid).toBe(true);
      expect(result.nodes.size).toBeGreaterThan(0);

      // Should have at least ground node and one other node
      const nodeIds = Array.from(result.nodes.keys());
      expect(nodeIds).toContain('ground');
    });

    it('should handle parallel resistor circuits', () => {
      // Parallel resistors: Battery -> (R1 || R2)
      const battery = new Battery('battery1', { x: 0, y: 0 }, 12);
      const resistor1 = new Resistor('resistor1', { x: 100, y: 0 }, 1000);
      const resistor2 = new Resistor('resistor2', { x: 100, y: 100 }, 2000);

      const components: IElectricalComponent[] = [battery, resistor1, resistor2];
      const connections: Connection[] = [
        {
          id: 'conn1',
          fromComponent: 'battery1',
          fromTerminal: 'positive',
          toComponent: 'resistor1',
          toTerminal: 'terminal1'
        },
        {
          id: 'conn2',
          fromComponent: 'battery1',
          fromTerminal: 'positive',
          toComponent: 'resistor2',
          toTerminal: 'terminal1'
        },
        {
          id: 'conn3',
          fromComponent: 'resistor1',
          fromTerminal: 'terminal2',
          toComponent: 'battery1',
          toTerminal: 'negative'
        },
        {
          id: 'conn4',
          fromComponent: 'resistor2',
          fromTerminal: 'terminal2',
          toComponent: 'battery1',
          toTerminal: 'negative'
        }
      ];

      const result = simulator.simulate(components, connections);

      expect(result.isValid).toBe(true);

      const resistor1State = result.componentStates.get('resistor1');
      const resistor2State = result.componentStates.get('resistor2');

      // Both resistors should have the same voltage (battery voltage)
      expect(resistor1State!.voltage).toBeCloseTo(12, 1);
      expect(resistor2State!.voltage).toBeCloseTo(12, 1);

      // Currents should be different: I1 = 12/1000 = 0.012A, I2 = 12/2000 = 0.006A
      expect(resistor1State!.current).toBeCloseTo(0.012, 3);
      expect(resistor2State!.current).toBeCloseTo(0.006, 3);
    });
  });

  describe('Component State Calculations', () => {
    it('should calculate power correctly for resistors', () => {
      const battery = new Battery('battery1', { x: 0, y: 0 }, 10);
      const resistor = new Resistor('resistor1', { x: 100, y: 0 }, 500);

      const components: IElectricalComponent[] = [battery, resistor];
      const connections: Connection[] = [
        {
          id: 'conn1',
          fromComponent: 'battery1',
          fromTerminal: 'positive',
          toComponent: 'resistor1',
          toTerminal: 'terminal1'
        },
        {
          id: 'conn2',
          fromComponent: 'resistor1',
          fromTerminal: 'terminal2',
          toComponent: 'battery1',
          toTerminal: 'negative'
        }
      ];

      const result = simulator.simulate(components, connections);

      const resistorState = result.componentStates.get('resistor1');
      
      // P = V²/R = 10²/500 = 0.2W
      expect(resistorState!.power).toBeCloseTo(0.2, 2);
      
      // Also P = I*V = 0.02*10 = 0.2W
      expect(resistorState!.current * resistorState!.voltage).toBeCloseTo(0.2, 2);
    });

    it('should determine LED brightness based on current', () => {
      const battery = new Battery('battery1', { x: 0, y: 0 }, 3);
      const resistor = new Resistor('resistor1', { x: 100, y: 0 }, 50);
      const led = new LED('led1', { x: 200, y: 0 }, 2.0);

      const components: IElectricalComponent[] = [battery, resistor, led];
      const connections: Connection[] = [
        {
          id: 'conn1',
          fromComponent: 'battery1',
          fromTerminal: 'positive',
          toComponent: 'resistor1',
          toTerminal: 'terminal1'
        },
        {
          id: 'conn2',
          fromComponent: 'resistor1',
          fromTerminal: 'terminal2',
          toComponent: 'led1',
          toTerminal: 'anode'
        },
        {
          id: 'conn3',
          fromComponent: 'led1',
          fromTerminal: 'cathode',
          toComponent: 'battery1',
          toTerminal: 'negative'
        }
      ];

      const result = simulator.simulate(components, connections);

      const ledState = result.componentStates.get('led1');
      expect(ledState!.isActive).toBe(true);
      expect(ledState!.additionalProperties?.brightness).toBeDefined();
      expect(ledState!.additionalProperties?.brightness).toBeGreaterThan(0);
      expect(ledState!.additionalProperties?.brightness).toBeLessThanOrEqual(1);
    });

    it('should handle LED with insufficient voltage', () => {
      const battery = new Battery('battery1', { x: 0, y: 0 }, 1.5); // Too low for LED
      const led = new LED('led1', { x: 100, y: 0 }, 2.0);

      const components: IElectricalComponent[] = [battery, led];
      const connections: Connection[] = [
        {
          id: 'conn1',
          fromComponent: 'battery1',
          fromTerminal: 'positive',
          toComponent: 'led1',
          toTerminal: 'anode'
        },
        {
          id: 'conn2',
          fromComponent: 'led1',
          fromTerminal: 'cathode',
          toComponent: 'battery1',
          toTerminal: 'negative'
        }
      ];

      const result = simulator.simulate(components, connections);

      const ledState = result.componentStates.get('led1');
      expect(ledState!.isActive).toBe(false);
      expect(ledState!.additionalProperties?.brightness).toBe(0);
      expect(led.isLit()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty circuits gracefully', () => {
      const result = simulator.simulate([], []);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Circuit must contain at least one voltage source (battery)');
    });

    it('should handle malformed connections gracefully', () => {
      const battery = new Battery('battery1', { x: 0, y: 0 }, 9);
      const resistor = new Resistor('resistor1', { x: 100, y: 0 }, 1000);

      const components: IElectricalComponent[] = [battery, resistor];
      const connections: Connection[] = [
        {
          id: 'conn1',
          fromComponent: 'nonexistent',
          fromTerminal: 'positive',
          toComponent: 'resistor1',
          toTerminal: 'terminal1'
        }
      ];

      const result = simulator.simulate(components, connections);

      // Should not crash and should provide meaningful error information
      expect(result.isValid).toBe(false);
    });

    it('should handle numerical edge cases', () => {
      // Very high resistance
      const battery = new Battery('battery1', { x: 0, y: 0 }, 9);
      const resistor = new Resistor('resistor1', { x: 100, y: 0 }, 1e9); // 1GΩ

      const components: IElectricalComponent[] = [battery, resistor];
      const connections: Connection[] = [
        {
          id: 'conn1',
          fromComponent: 'battery1',
          fromTerminal: 'positive',
          toComponent: 'resistor1',
          toTerminal: 'terminal1'
        },
        {
          id: 'conn2',
          fromComponent: 'resistor1',
          fromTerminal: 'terminal2',
          toComponent: 'battery1',
          toTerminal: 'negative'
        }
      ];

      const result = simulator.simulate(components, connections);

      expect(result.isValid).toBe(true);
      const resistorState = result.componentStates.get('resistor1');
      expect(resistorState!.current).toBeCloseTo(9e-9, 12); // Very small current
    });
  });
});