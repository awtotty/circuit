// Unit tests for component base classes and interfaces

import { describe, it, expect, beforeEach } from 'vitest';
import type { Position } from '../index';
import { BaseElectricalComponent, type IElectricalComponent, type Terminal, type ValidationResult } from '../components';

// Test implementation of BaseElectricalComponent for testing
class TestComponent extends BaseElectricalComponent {
  constructor(id: string, position: Position) {
    super(id, 'resistor', position, { testProperty: 'test' });
  }

  protected initializeTerminals(): Terminal[] {
    return [
      this.createTerminal('test1', { x: -10, y: 0 }, 'input'),
      this.createTerminal('test2', { x: 10, y: 0 }, 'output')
    ];
  }

  protected validateSpecific(): ValidationResult {
    return { isValid: true, errors: [], warnings: [] };
  }

  public clone(): IElectricalComponent {
    return new TestComponent(this.id + '_copy', { ...this.position });
  }
}

describe('BaseElectricalComponent', () => {
  let component: TestComponent;
  const testPosition: Position = { x: 100, y: 200 };

  beforeEach(() => {
    component = new TestComponent('test-id', testPosition);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(component.id).toBe('test-id');
      expect(component.type).toBe('resistor');
      expect(component.position).toEqual(testPosition);
      expect(component.properties).toEqual({ testProperty: 'test' });
      expect(component.connections).toEqual([]);
      expect(component.terminals).toHaveLength(2);
    });

    it('should initialize terminals with correct positions', () => {
      expect(component.terminals[0].position).toEqual({ x: 90, y: 200 });
      expect(component.terminals[1].position).toEqual({ x: 110, y: 200 });
    });
  });

  describe('validate', () => {
    it('should pass validation for valid component', () => {
      const result = component.validate();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for empty ID', () => {
      component.id = '';
      const result = component.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Component ID is required');
    });

    it('should fail validation for invalid position', () => {
      component.position = { x: NaN, y: 200 };
      const result = component.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Valid position is required');
    });
  });

  describe('serialize', () => {
    it('should serialize component correctly', () => {
      const serialized = component.serialize();
      expect(serialized).toEqual({
        id: 'test-id',
        type: 'resistor',
        position: testPosition,
        properties: { testProperty: 'test' },
        connections: []
      });
    });

    it('should create deep copies of position and properties', () => {
      const serialized = component.serialize();
      
      // Modify original
      component.position.x = 999;
      component.properties.testProperty = 'modified';
      
      // Serialized should be unchanged
      expect(serialized.position.x).toBe(100);
      expect(serialized.properties.testProperty).toBe('test');
    });
  });

  describe('property management', () => {
    it('should get property correctly', () => {
      expect(component.getProperty<string>('testProperty')).toBe('test');
      expect(component.getProperty<string>('nonexistent')).toBeUndefined();
    });

    it('should set property correctly', () => {
      component.setProperty('newProperty', 42);
      expect(component.getProperty<number>('newProperty')).toBe(42);
    });

    it('should handle different property types', () => {
      component.setProperty('stringProp', 'hello');
      component.setProperty('numberProp', 123);
      component.setProperty('booleanProp', true);

      expect(component.getProperty<string>('stringProp')).toBe('hello');
      expect(component.getProperty<number>('numberProp')).toBe(123);
      expect(component.getProperty<boolean>('booleanProp')).toBe(true);
    });
  });

  describe('clone', () => {
    it('should create a clone with modified ID', () => {
      const cloned = component.clone();
      expect(cloned.id).toBe('test-id_copy');
      expect(cloned.position).toEqual(component.position);
      expect(cloned.type).toBe(component.type);
    });
  });

  describe('createTerminal', () => {
    it('should create terminal with absolute position', () => {
      // Create a fresh component to ensure clean state
      const testComp = new TestComponent('terminal-test', { x: 100, y: 200 });
      const terminal = testComp['createTerminal']('test', { x: 5, y: -5 }, 'bidirectional');
      
      expect(terminal.id).toBe('test');
      expect(terminal.position).toEqual({ x: 105, y: 195 });
      expect(terminal.type).toBe('bidirectional');
      expect(terminal.connected).toBe(false);
    });
  });
});

describe('Terminal interface', () => {
  it('should have correct structure', () => {
    const terminal: Terminal = {
      id: 'terminal-1',
      position: { x: 0, y: 0 },
      type: 'input',
      connected: false
    };

    expect(terminal.id).toBe('terminal-1');
    expect(terminal.position).toEqual({ x: 0, y: 0 });
    expect(terminal.type).toBe('input');
    expect(terminal.connected).toBe(false);
    expect(terminal.connectionId).toBeUndefined();
  });

  it('should support connection ID when connected', () => {
    const terminal: Terminal = {
      id: 'terminal-1',
      position: { x: 0, y: 0 },
      type: 'output',
      connected: true,
      connectionId: 'connection-123'
    };

    expect(terminal.connected).toBe(true);
    expect(terminal.connectionId).toBe('connection-123');
  });
});

describe('ValidationResult interface', () => {
  it('should handle valid result', () => {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('should handle invalid result with errors and warnings', () => {
    const result: ValidationResult = {
      isValid: false,
      errors: ['Error 1', 'Error 2'],
      warnings: ['Warning 1']
    };

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.warnings).toHaveLength(1);
  });
});