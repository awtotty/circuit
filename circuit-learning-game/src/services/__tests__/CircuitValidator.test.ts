// Tests for CircuitValidator service

import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitValidator, type CircuitError, type ValidationResult } from '../CircuitValidator';
import { Battery, Resistor, LED, Wire } from '../../types/electrical-components';
import type { Connection } from '../../types';
import type { IElectricalComponent } from '../../types/components';

describe('CircuitValidator', () => {
  let validator: CircuitValidator;
  let battery: Battery;
  let resistor: Resistor;
  let led: LED;
  let wire: Wire;

  beforeEach(() => {
    validator = new CircuitValidator();
    battery = new Battery('battery1', { x: 0, y: 0 }, 9);
    resistor = new Resistor('resistor1', { x: 50, y: 0 }, 220);
    led = new LED('led1', { x: 100, y: 0 }, 2.0);
    wire = new Wire('wire1', { x: 0, y: 0 }, [{ x: 0, y: 0 }, { x: 50, y: 0 }]);
  });

  describe('validateCircuit', () => {
    it('should return valid result for empty circuit', () => {
      const result = validator.validateCircuit([], []);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect missing power source', () => {
      const components = [resistor, led];
      const result = validator.validateCircuit(components, []);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('no_power_source');
      expect(result.errors[0].message).toContain('No power source found');
    });

    it('should detect disconnected components', () => {
      const components = [battery, resistor];
      const result = validator.validateCircuit(components, []);
      
      expect(result.isValid).toBe(true); // No errors, but warnings
      expect(result.warnings.length).toBeGreaterThan(0);
      
      const disconnectedWarnings = result.warnings.filter(w => w.type === 'disconnected_component');
      expect(disconnectedWarnings).toHaveLength(2); // Both components disconnected
    });
  });

  describe('short circuit detection', () => {
    it('should detect direct short circuit', () => {
      const components = [battery, wire];
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

      const result = validator.validateCircuit(components, connections);
      
      expect(result.isValid).toBe(false);
      const shortCircuitErrors = result.errors.filter(e => e.type === 'short_circuit');
      expect(shortCircuitErrors.length).toBeGreaterThan(0);
      expect(shortCircuitErrors[0].message).toContain('Short circuit detected');
      expect(shortCircuitErrors[0].educationalExplanation).toContain('extremely high current flow');
    });

    it('should not detect short circuit with sufficient resistance', () => {
      const components = [battery, resistor];
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

      const result = validator.validateCircuit(components, connections);
      
      const shortCircuitErrors = result.errors.filter(e => e.type === 'short_circuit');
      expect(shortCircuitErrors).toHaveLength(0);
    });
  });

  describe('open circuit detection', () => {
    it('should detect open circuit when no complete path exists', () => {
      const components = [battery, resistor];
      const connections: Connection[] = [
        {
          id: 'conn1',
          fromComponent: 'battery1',
          fromTerminal: 'positive',
          toComponent: 'resistor1',
          toTerminal: 'terminal1'
        }
        // Missing connection back to battery negative terminal
      ];

      const result = validator.validateCircuit(components, connections);
      
      expect(result.isValid).toBe(false);
      const openCircuitErrors = result.errors.filter(e => e.type === 'open_circuit');
      expect(openCircuitErrors.length).toBeGreaterThan(0);
      expect(openCircuitErrors[0].message).toContain('No complete path');
      expect(openCircuitErrors[0].educationalExplanation).toContain('no current can flow');
    });

    it('should not detect open circuit when complete path exists', () => {
      const components = [battery, resistor];
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

      const result = validator.validateCircuit(components, connections);
      
      const openCircuitErrors = result.errors.filter(e => e.type === 'open_circuit');
      expect(openCircuitErrors).toHaveLength(0);
    });
  });

  describe('invalid connection detection', () => {
    it('should detect connection to non-existent component', () => {
      const components = [battery];
      const connections: Connection[] = [
        {
          id: 'conn1',
          fromComponent: 'battery1',
          fromTerminal: 'positive',
          toComponent: 'nonexistent',
          toTerminal: 'terminal1'
        }
      ];

      const result = validator.validateCircuit(components, connections);
      
      expect(result.isValid).toBe(false);
      const invalidConnErrors = result.errors.filter(e => e.type === 'invalid_connection');
      expect(invalidConnErrors.length).toBeGreaterThan(0);
      expect(invalidConnErrors[0].message).toContain('Component not found');
    });

    it('should detect connection to non-existent terminal', () => {
      const components = [battery, resistor];
      const connections: Connection[] = [
        {
          id: 'conn1',
          fromComponent: 'battery1',
          fromTerminal: 'nonexistent_terminal',
          toComponent: 'resistor1',
          toTerminal: 'terminal1'
        }
      ];

      const result = validator.validateCircuit(components, connections);
      
      expect(result.isValid).toBe(false);
      const invalidConnErrors = result.errors.filter(e => e.type === 'invalid_connection');
      expect(invalidConnErrors.length).toBeGreaterThan(0);
      expect(invalidConnErrors[0].message).toContain('Terminal not found');
    });
  });

  describe('component overload detection', () => {
    it('should warn about LED overload with high current', () => {
      // Create a circuit with high voltage and low resistance to cause overload
      const highVoltageBattery = new Battery('battery1', { x: 0, y: 0 }, 12);
      const lowResistor = new Resistor('resistor1', { x: 50, y: 0 }, 10); // Very low resistance
      const components = [highVoltageBattery, lowResistor, led];
      
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

      const result = validator.validateCircuit(components, connections);
      
      const overloadWarnings = result.warnings.filter(w => w.type === 'component_overload');
      expect(overloadWarnings.length).toBeGreaterThan(0);
      expect(overloadWarnings[0].message).toContain('excessive current');
      expect(overloadWarnings[0].educationalExplanation).toContain('maximum current rating');
    });
  });

  describe('reverse polarity detection', () => {
    it('should warn about LED connected with reverse polarity', () => {
      const components = [battery, led];
      const connections: Connection[] = [
        {
          id: 'conn1',
          fromComponent: 'battery1',
          fromTerminal: 'negative', // Wrong polarity
          toComponent: 'led1',
          toTerminal: 'anode'
        },
        {
          id: 'conn2',
          fromComponent: 'led1',
          fromTerminal: 'cathode',
          toComponent: 'battery1',
          toTerminal: 'positive'
        }
      ];

      const result = validator.validateCircuit(components, connections);
      
      const polarityWarnings = result.warnings.filter(w => w.type === 'reverse_polarity');
      expect(polarityWarnings.length).toBeGreaterThan(0);
      expect(polarityWarnings[0].message).toContain('reverse polarity');
      expect(polarityWarnings[0].educationalExplanation).toContain('only allow current to flow in one direction');
    });
  });

  describe('missing current limiting detection', () => {
    it('should warn about LED without current limiting resistor', () => {
      const components = [battery, led];
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

      const result = validator.validateCircuit(components, connections);
      
      const currentLimitWarnings = result.warnings.filter(w => w.type === 'missing_current_limiting');
      expect(currentLimitWarnings.length).toBeGreaterThan(0);
      expect(currentLimitWarnings[0].message).toContain('current-limiting resistor');
      expect(currentLimitWarnings[0].educationalExplanation).toContain('prevent damage from excessive current');
    });

    it('should not warn when LED has series resistor', () => {
      const components = [battery, resistor, led];
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

      const result = validator.validateCircuit(components, connections);
      
      const currentLimitWarnings = result.warnings.filter(w => w.type === 'missing_current_limiting');
      expect(currentLimitWarnings).toHaveLength(0);
    });
  });

  describe('duplicate connection detection', () => {
    it('should detect duplicate connections between same terminals', () => {
      const components = [battery, resistor];
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
          toComponent: 'resistor1',
          toTerminal: 'terminal1'
        }
      ];

      const result = validator.validateCircuit(components, connections);
      
      const duplicateWarnings = result.warnings.filter(w => w.type === 'duplicate_connection');
      expect(duplicateWarnings.length).toBeGreaterThan(0);
      expect(duplicateWarnings[0].message).toContain('Duplicate connections');
      expect(duplicateWarnings[0].affectedConnections).toContain('conn1');
      expect(duplicateWarnings[0].affectedConnections).toContain('conn2');
    });
  });

  describe('floating node detection', () => {
    it('should detect floating terminals', () => {
      const components = [battery, resistor];
      const connections: Connection[] = [
        {
          id: 'conn1',
          fromComponent: 'battery1',
          fromTerminal: 'positive',
          toComponent: 'resistor1',
          toTerminal: 'terminal1'
        }
        // resistor terminal2 and battery negative are floating
      ];

      const result = validator.validateCircuit(components, connections);
      
      const floatingWarnings = result.info.filter(w => w.type === 'floating_node');
      expect(floatingWarnings.length).toBeGreaterThan(0);
      expect(floatingWarnings[0].message).toContain('floating terminal');
    });
  });

  describe('educational explanations', () => {
    it('should provide educational explanations for all error types', () => {
      const components = [battery, wire];
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

      const result = validator.validateCircuit(components, connections);
      
      // Check that all errors have educational explanations
      for (const error of result.errors) {
        expect(error.educationalExplanation).toBeDefined();
        expect(error.educationalExplanation.length).toBeGreaterThan(50); // Substantial explanation
        expect(error.suggestedFix).toBeDefined();
      }

      for (const warning of result.warnings) {
        expect(warning.educationalExplanation).toBeDefined();
        expect(warning.educationalExplanation.length).toBeGreaterThan(50);
      }
    });

    it('should provide visual highlighting information', () => {
      const components = [battery];
      const result = validator.validateCircuit(components, []);
      
      const powerSourceError = result.errors.find(e => e.type === 'no_power_source');
      expect(powerSourceError?.visualHighlight).toBeDefined();
      expect(powerSourceError?.visualHighlight?.color).toBeDefined();
      expect(powerSourceError?.visualHighlight?.style).toBeDefined();
    });
  });

  describe('complex circuit scenarios', () => {
    it('should handle complex circuit with multiple issues', () => {
      const battery2 = new Battery('battery2', { x: 200, y: 0 }, 6);
      const resistor2 = new Resistor('resistor2', { x: 150, y: 0 }, 100);
      const led2 = new LED('led2', { x: 250, y: 0 }, 2.0);
      
      const components = [battery, resistor, led, battery2, resistor2, led2];
      const connections: Connection[] = [
        // First circuit - good
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
        },
        // Second circuit - LED without resistor
        {
          id: 'conn4',
          fromComponent: 'battery2',
          fromTerminal: 'positive',
          toComponent: 'led2',
          toTerminal: 'anode'
        },
        {
          id: 'conn5',
          fromComponent: 'led2',
          fromTerminal: 'cathode',
          toComponent: 'battery2',
          toTerminal: 'negative'
        }
        // resistor2 is disconnected
      ];

      const result = validator.validateCircuit(components, connections);
      
      // Should detect multiple issues
      const disconnectedWarnings = result.warnings.filter(w => w.type === 'disconnected_component');
      const currentLimitWarnings = result.warnings.filter(w => w.type === 'missing_current_limiting');
      
      expect(disconnectedWarnings.length).toBeGreaterThan(0);
      expect(currentLimitWarnings.length).toBeGreaterThan(0);
      
      // Each error should have proper component/connection references
      for (const warning of result.warnings) {
        expect(warning.affectedComponents.length + warning.affectedConnections.length).toBeGreaterThan(0);
      }
    });
  });
});