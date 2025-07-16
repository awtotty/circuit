// Unit tests for component utility functions

import { describe, it, expect, beforeEach } from 'vitest';
import type { Position, ComponentType, ComponentProperties } from '../../types';
import type { ComponentData } from '../../types/components';
import { Resistor, Battery, LED, Wire } from '../../types/electrical-components';
import {
  ComponentFactory,
  ComponentValidator,
  ComponentSerializer,
  ComponentPropertyManager,
  generateComponentId,
  calculateDistance,
  isPositionInBounds
} from '../component-utils';

describe('ComponentFactory', () => {
  const testPosition: Position = { x: 100, y: 200 };

  describe('createComponent', () => {
    it('should create resistor correctly', () => {
      const component = ComponentFactory.createComponent(
        'resistor',
        'test-resistor',
        testPosition,
        { resistance: 2200 }
      );

      expect(component).toBeInstanceOf(Resistor);
      expect(component.id).toBe('test-resistor');
      expect(component.type).toBe('resistor');
      expect(component.position).toEqual(testPosition);
      expect((component as Resistor).getResistance()).toBe(2200);
    });

    it('should create battery correctly', () => {
      const component = ComponentFactory.createComponent(
        'battery',
        'test-battery',
        testPosition,
        { voltage: 12 }
      );

      expect(component).toBeInstanceOf(Battery);
      expect(component.id).toBe('test-battery');
      expect((component as Battery).getVoltage()).toBe(12);
    });

    it('should create LED correctly', () => {
      const component = ComponentFactory.createComponent(
        'led',
        'test-led',
        testPosition,
        { forwardVoltage: 3.3 }
      );

      expect(component).toBeInstanceOf(LED);
      expect(component.id).toBe('test-led');
      expect((component as LED).getForwardVoltage()).toBe(3.3);
    });

    it('should create wire correctly', () => {
      const points = [{ x: 0, y: 0 }, { x: 50, y: 50 }];
      const component = ComponentFactory.createComponent(
        'wire',
        'test-wire',
        testPosition,
        { points: JSON.stringify(points) }
      );

      expect(component).toBeInstanceOf(Wire);
      expect(component.id).toBe('test-wire');
      expect((component as Wire).getPoints()).toEqual(points);
    });

    it('should throw error for unsupported component type', () => {
      expect(() => {
        ComponentFactory.createComponent(
          'unsupported' as ComponentType,
          'test',
          testPosition
        );
      }).toThrow('Unsupported component type: unsupported');
    });
  });

  describe('fromData', () => {
    it('should create component from serialized data', () => {
      const data = {
        id: 'test-resistor',
        type: 'resistor' as ComponentType,
        position: testPosition,
        properties: { resistance: 1500 },
        connections: []
      };

      const component = ComponentFactory.fromData(data);
      expect(component).toBeInstanceOf(Resistor);
      expect(component.id).toBe('test-resistor');
      expect((component as Resistor).getResistance()).toBe(1500);
    });
  });
});

describe('ComponentValidator', () => {
  let resistor: Resistor;
  let battery: Battery;

  beforeEach(() => {
    resistor = new Resistor('resistor-1', { x: 0, y: 0 }, 1000);
    battery = new Battery('battery-1', { x: 50, y: 0 }, 9);
  });

  describe('validateComponent', () => {
    it('should validate single component correctly', () => {
      const result = ComponentValidator.validateComponent(resistor);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return validation errors for invalid component', () => {
      resistor.setProperty('resistance', -100);
      const result = ComponentValidator.validateComponent(resistor);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateComponents', () => {
    it('should validate multiple components correctly', () => {
      const result = ComponentValidator.validateComponents([resistor, battery]);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect duplicate IDs', () => {
      const duplicateResistor = new Resistor('resistor-1', { x: 100, y: 0 }, 2200);
      const result = ComponentValidator.validateComponents([resistor, duplicateResistor]);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Duplicate component IDs'))).toBe(true);
    });

    it('should aggregate errors from multiple components', () => {
      resistor.setProperty('resistance', -100);
      battery.setProperty('voltage', 0);
      
      const result = ComponentValidator.validateComponents([resistor, battery]);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});

describe('ComponentSerializer', () => {
  let resistor: Resistor;

  beforeEach(() => {
    resistor = new Resistor('resistor-1', { x: 100, y: 200 }, 1000);
  });

  describe('serialize', () => {
    it('should serialize component correctly', () => {
      const serialized = ComponentSerializer.serialize(resistor);
      
      expect(serialized).toEqual({
        id: 'resistor-1',
        type: 'resistor',
        position: { x: 100, y: 200 },
        properties: { resistance: 1000 },
        connections: []
      });
    });
  });

  describe('serializeComponents', () => {
    it('should serialize multiple components', () => {
      const battery = new Battery('battery-1', { x: 200, y: 300 }, 9);
      const serialized = ComponentSerializer.serializeComponents([resistor, battery]);
      
      expect(serialized).toHaveLength(2);
      expect(serialized[0].id).toBe('resistor-1');
      expect(serialized[1].id).toBe('battery-1');
    });
  });

  describe('deserialize', () => {
    it('should deserialize component correctly', () => {
      const data = {
        id: 'resistor-1',
        type: 'resistor' as ComponentType,
        position: { x: 100, y: 200 },
        properties: { resistance: 1000 },
        connections: []
      };

      const component = ComponentSerializer.deserialize(data);
      expect(component).toBeInstanceOf(Resistor);
      expect(component.id).toBe('resistor-1');
      expect((component as Resistor).getResistance()).toBe(1000);
    });
  });

  describe('deserializeComponents', () => {
    it('should deserialize multiple components', () => {
      const dataArray: ComponentData[] = [
        {
          id: 'resistor-1',
          type: 'resistor' as ComponentType,
          position: { x: 100, y: 200 },
          properties: { resistance: 1000 },
          connections: []
        },
        {
          id: 'battery-1',
          type: 'battery' as ComponentType,
          position: { x: 200, y: 300 },
          properties: { voltage: 9 },
          connections: []
        }
      ];

      const components = ComponentSerializer.deserializeComponents(dataArray);
      expect(components).toHaveLength(2);
      expect(components[0]).toBeInstanceOf(Resistor);
      expect(components[1]).toBeInstanceOf(Battery);
    });
  });
});

describe('ComponentPropertyManager', () => {
  describe('getDefaultProperties', () => {
    it('should return correct default properties for resistor', () => {
      const defaults = ComponentPropertyManager.getDefaultProperties('resistor');
      expect(defaults).toEqual({ resistance: 1000 });
    });

    it('should return correct default properties for battery', () => {
      const defaults = ComponentPropertyManager.getDefaultProperties('battery');
      expect(defaults).toEqual({ voltage: 9 });
    });

    it('should return correct default properties for LED', () => {
      const defaults = ComponentPropertyManager.getDefaultProperties('led');
      expect(defaults).toEqual({
        forwardVoltage: 2.0,
        isLit: false,
        brightness: 0
      });
    });

    it('should return correct default properties for wire', () => {
      const defaults = ComponentPropertyManager.getDefaultProperties('wire');
      expect(defaults).toEqual({
        points: JSON.stringify([]),
        resistance: 0.01
      });
    });

    it('should return empty object for unknown type', () => {
      const defaults = ComponentPropertyManager.getDefaultProperties('unknown' as ComponentType);
      expect(defaults).toEqual({});
    });
  });

  describe('validateProperty', () => {
    it('should validate resistor resistance correctly', () => {
      const validResult = ComponentPropertyManager.validateProperty('resistor', 'resistance', 1000);
      expect(validResult.isValid).toBe(true);

      const invalidResult = ComponentPropertyManager.validateProperty('resistor', 'resistance', -100);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Resistance must be a positive number');

      const warningResult = ComponentPropertyManager.validateProperty('resistor', 'resistance', 0.5);
      expect(warningResult.isValid).toBe(true);
      expect(warningResult.warnings).toContain('Very low resistance may cause high current');
    });

    it('should validate battery voltage correctly', () => {
      const validResult = ComponentPropertyManager.validateProperty('battery', 'voltage', 9);
      expect(validResult.isValid).toBe(true);

      const invalidResult = ComponentPropertyManager.validateProperty('battery', 'voltage', 0);
      expect(invalidResult.isValid).toBe(false);

      const warningResult = ComponentPropertyManager.validateProperty('battery', 'voltage', 15);
      expect(warningResult.isValid).toBe(true);
      expect(warningResult.warnings).toContain('High voltage may be dangerous in educational context');
    });

    it('should validate LED properties correctly', () => {
      const validVoltage = ComponentPropertyManager.validateProperty('led', 'forwardVoltage', 2.0);
      expect(validVoltage.isValid).toBe(true);

      const validBrightness = ComponentPropertyManager.validateProperty('led', 'brightness', 0.5);
      expect(validBrightness.isValid).toBe(true);

      const invalidBrightness = ComponentPropertyManager.validateProperty('led', 'brightness', 1.5);
      expect(invalidBrightness.isValid).toBe(false);
      expect(invalidBrightness.errors).toContain('Brightness must be between 0 and 1');
    });
  });

  describe('cloneProperties', () => {
    it('should clone simple properties correctly', () => {
      const original: ComponentProperties = {
        resistance: 1000,
        name: 'test',
        active: true
      };

      const cloned = ComponentPropertyManager.cloneProperties(original);
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
    });

    it('should deep clone object properties', () => {
      const original: ComponentProperties = {
        configString: JSON.stringify({ nested: { value: 42 } }),
        simple: 'test'
      };

      const cloned = ComponentPropertyManager.cloneProperties(original);
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      
      // Modify original
      original.configString = JSON.stringify({ nested: { value: 999 } });
      
      // Cloned should be unchanged
      expect(cloned.configString).toBe(JSON.stringify({ nested: { value: 42 } }));
    });
  });
});

describe('Utility Functions', () => {
  describe('generateComponentId', () => {
    it('should generate unique IDs with correct format', () => {
      const id1 = generateComponentId('resistor');
      const id2 = generateComponentId('resistor');
      
      expect(id1).toMatch(/^resistor_\d+_\d+$/);
      expect(id2).toMatch(/^resistor_\d+_\d+$/);
      expect(id1).not.toBe(id2);
    });

    it('should include component type in ID', () => {
      const resistorId = generateComponentId('resistor');
      const batteryId = generateComponentId('battery');
      
      expect(resistorId).toMatch(/^resistor_/);
      expect(batteryId).toMatch(/^battery_/);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance correctly', () => {
      const pos1: Position = { x: 0, y: 0 };
      const pos2: Position = { x: 3, y: 4 };
      
      const distance = calculateDistance(pos1, pos2);
      expect(distance).toBe(5); // 3-4-5 triangle
    });

    it('should handle same position', () => {
      const pos: Position = { x: 10, y: 20 };
      const distance = calculateDistance(pos, pos);
      expect(distance).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const pos1: Position = { x: -3, y: -4 };
      const pos2: Position = { x: 0, y: 0 };
      
      const distance = calculateDistance(pos1, pos2);
      expect(distance).toBe(5);
    });
  });

  describe('isPositionInBounds', () => {
    const bounds = { width: 100, height: 200 };

    it('should return true for position within bounds', () => {
      const position: Position = { x: 50, y: 100 };
      expect(isPositionInBounds(position, bounds)).toBe(true);
    });

    it('should return true for position on boundary', () => {
      const position: Position = { x: 100, y: 200 };
      expect(isPositionInBounds(position, bounds)).toBe(true);
    });

    it('should return false for position outside bounds', () => {
      const position: Position = { x: 150, y: 100 };
      expect(isPositionInBounds(position, bounds)).toBe(false);
    });

    it('should return false for negative coordinates', () => {
      const position: Position = { x: -10, y: 50 };
      expect(isPositionInBounds(position, bounds)).toBe(false);
    });
  });
});