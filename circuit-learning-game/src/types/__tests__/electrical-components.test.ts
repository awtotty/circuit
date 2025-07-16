// Unit tests for specific electrical component implementations

import { describe, it, expect, beforeEach } from 'vitest';
import type { Position } from '../index';
import { Resistor, Battery, LED, Wire } from '../electrical-components';

describe('Resistor', () => {
  let resistor: Resistor;
  const testPosition: Position = { x: 50, y: 100 };

  beforeEach(() => {
    resistor = new Resistor('resistor-1', testPosition, 1000);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(resistor.id).toBe('resistor-1');
      expect(resistor.type).toBe('resistor');
      expect(resistor.position).toEqual(testPosition);
      expect(resistor.getResistance()).toBe(1000);
    });

    it('should use default resistance when not provided', () => {
      const defaultResistor = new Resistor('resistor-2', testPosition);
      expect(defaultResistor.getResistance()).toBe(1000);
    });

    it('should initialize terminals correctly', () => {
      expect(resistor.terminals).toHaveLength(2);
      expect(resistor.terminals[0].type).toBe('bidirectional');
      expect(resistor.terminals[1].type).toBe('bidirectional');
      expect(resistor.terminals[0].position).toEqual({ x: 30, y: 100 });
      expect(resistor.terminals[1].position).toEqual({ x: 70, y: 100 });
    });
  });

  describe('validation', () => {
    it('should pass validation for valid resistance', () => {
      const result = resistor.validate();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for zero resistance', () => {
      resistor.setProperty('resistance', 0);
      const result = resistor.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Resistance must be a positive number');
    });

    it('should warn for very low resistance', () => {
      resistor.setProperty('resistance', 0.5);
      const result = resistor.validate();
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Very low resistance may cause high current');
    });
  });

  describe('resistance management', () => {
    it('should get and set resistance correctly', () => {
      resistor.setResistance(2200);
      expect(resistor.getResistance()).toBe(2200);
    });

    it('should not set negative resistance', () => {
      resistor.setResistance(-100);
      expect(resistor.getResistance()).toBe(1000); // Should remain unchanged
    });
  });

  describe('clone', () => {
    it('should clone correctly', () => {
      const cloned = resistor.clone() as Resistor;
      expect(cloned.id).toBe('resistor-1_copy');
      expect(cloned.getResistance()).toBe(1000);
      expect(cloned.position).toEqual(testPosition);
    });
  });
});

describe('Battery', () => {
  let battery: Battery;
  const testPosition: Position = { x: 75, y: 125 };

  beforeEach(() => {
    battery = new Battery('battery-1', testPosition, 9);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(battery.id).toBe('battery-1');
      expect(battery.type).toBe('battery');
      expect(battery.position).toEqual(testPosition);
      expect(battery.getVoltage()).toBe(9);
    });

    it('should use default voltage when not provided', () => {
      const defaultBattery = new Battery('battery-2', testPosition);
      expect(defaultBattery.getVoltage()).toBe(9);
    });

    it('should initialize terminals correctly', () => {
      expect(battery.terminals).toHaveLength(2);
      expect(battery.terminals[0].id).toBe('positive');
      expect(battery.terminals[0].type).toBe('output');
      expect(battery.terminals[1].id).toBe('negative');
      expect(battery.terminals[1].type).toBe('input');
    });
  });

  describe('validation', () => {
    it('should pass validation for valid voltage', () => {
      const result = battery.validate();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for zero voltage', () => {
      battery.setProperty('voltage', 0);
      const result = battery.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Voltage must be a positive number');
    });

    it('should warn for high voltage', () => {
      battery.setProperty('voltage', 15);
      const result = battery.validate();
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('High voltage may be dangerous in educational context');
    });
  });

  describe('voltage management', () => {
    it('should get and set voltage correctly', () => {
      battery.setVoltage(12);
      expect(battery.getVoltage()).toBe(12);
    });

    it('should not set negative voltage', () => {
      battery.setVoltage(-5);
      expect(battery.getVoltage()).toBe(9); // Should remain unchanged
    });
  });
});

describe('LED', () => {
  let led: LED;
  const testPosition: Position = { x: 200, y: 150 };

  beforeEach(() => {
    led = new LED('led-1', testPosition, 2.0);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(led.id).toBe('led-1');
      expect(led.type).toBe('led');
      expect(led.position).toEqual(testPosition);
      expect(led.getForwardVoltage()).toBe(2.0);
      expect(led.isLit()).toBe(false);
      expect(led.getBrightness()).toBe(0);
    });

    it('should initialize terminals correctly', () => {
      expect(led.terminals).toHaveLength(2);
      expect(led.terminals[0].id).toBe('anode');
      expect(led.terminals[0].type).toBe('input');
      expect(led.terminals[1].id).toBe('cathode');
      expect(led.terminals[1].type).toBe('output');
    });
  });

  describe('validation', () => {
    it('should pass validation for valid forward voltage', () => {
      const result = led.validate();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for zero forward voltage', () => {
      led.setProperty('forwardVoltage', 0);
      const result = led.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Forward voltage must be a positive number');
    });

    it('should warn for high forward voltage', () => {
      led.setProperty('forwardVoltage', 6);
      const result = led.validate();
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('High forward voltage is unusual for standard LEDs');
    });
  });

  describe('LED state management', () => {
    it('should manage lit state correctly', () => {
      expect(led.isLit()).toBe(false);
      led.setLit(true);
      expect(led.isLit()).toBe(true);
    });

    it('should manage brightness correctly', () => {
      led.setBrightness(0.7);
      expect(led.getBrightness()).toBe(0.7);
      expect(led.isLit()).toBe(true);
    });

    it('should clamp brightness to valid range', () => {
      led.setBrightness(1.5);
      expect(led.getBrightness()).toBe(1);
      
      led.setBrightness(-0.2);
      expect(led.getBrightness()).toBe(0);
      expect(led.isLit()).toBe(false);
    });

    it('should set lit state based on brightness', () => {
      led.setBrightness(0);
      expect(led.isLit()).toBe(false);
      
      led.setBrightness(0.1);
      expect(led.isLit()).toBe(true);
    });
  });

  describe('forward voltage management', () => {
    it('should get and set forward voltage correctly', () => {
      led.setForwardVoltage(3.3);
      expect(led.getForwardVoltage()).toBe(3.3);
    });

    it('should not set negative forward voltage', () => {
      led.setForwardVoltage(-1);
      expect(led.getForwardVoltage()).toBe(2.0); // Should remain unchanged
    });
  });
});

describe('Wire', () => {
  let wire: Wire;
  const testPosition: Position = { x: 0, y: 0 };
  const testPoints: Position[] = [
    { x: 10, y: 10 },
    { x: 50, y: 10 },
    { x: 50, y: 50 }
  ];

  beforeEach(() => {
    wire = new Wire('wire-1', testPosition, testPoints);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(wire.id).toBe('wire-1');
      expect(wire.type).toBe('wire');
      expect(wire.position).toEqual(testPosition);
      expect(wire.getPoints()).toEqual(testPoints);
    });

    it('should initialize with empty points when not provided', () => {
      const emptyWire = new Wire('wire-2', testPosition);
      expect(emptyWire.getPoints()).toEqual([]);
    });

    it('should initialize terminals for valid wire', () => {
      expect(wire.terminals).toHaveLength(2);
      expect(wire.terminals[0].id).toBe('start');
      expect(wire.terminals[1].id).toBe('end');
      expect(wire.terminals[0].position).toEqual({ x: 10, y: 10 });
      expect(wire.terminals[1].position).toEqual({ x: 50, y: 50 });
    });
  });

  describe('validation', () => {
    it('should pass validation for valid wire with points', () => {
      const result = wire.validate();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for wire with insufficient points', () => {
      const invalidWire = new Wire('wire-invalid', testPosition, [{ x: 0, y: 0 }]);
      const result = invalidWire.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Wire must have at least 2 points');
    });
  });

  describe('points management', () => {
    it('should get points correctly', () => {
      expect(wire.getPoints()).toEqual(testPoints);
    });

    it('should set points correctly', () => {
      const newPoints = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
      wire.setPoints(newPoints);
      expect(wire.getPoints()).toEqual(newPoints);
    });

    it('should update terminals when points change', () => {
      const newPoints = [{ x: 20, y: 30 }, { x: 80, y: 90 }];
      wire.setPoints(newPoints);
      
      expect(wire.terminals[0].position).toEqual({ x: 20, y: 30 });
      expect(wire.terminals[1].position).toEqual({ x: 80, y: 90 });
    });

    it('should add points correctly', () => {
      const newPoint = { x: 75, y: 75 };
      wire.addPoint(newPoint);
      
      const points = wire.getPoints();
      expect(points).toHaveLength(4);
      expect(points[3]).toEqual(newPoint);
    });

    it('should handle invalid JSON in points property', () => {
      wire.setProperty('points', 'invalid-json');
      expect(wire.getPoints()).toEqual([]);
    });
  });

  describe('clone', () => {
    it('should clone correctly with points', () => {
      const cloned = wire.clone() as Wire;
      expect(cloned.id).toBe('wire-1_copy');
      expect(cloned.getPoints()).toEqual(testPoints);
      expect(cloned.position).toEqual(testPosition);
    });
  });
});