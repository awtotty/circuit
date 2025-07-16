// Base classes and interfaces for electrical components

import type { Position, ComponentType, ComponentProperties } from './index';

export interface IElectricalComponent {
  id: string;
  type: ComponentType;
  position: Position;
  properties: ComponentProperties;
  connections: string[];
  terminals: Terminal[];
  
  // Core methods
  validate(): ValidationResult;
  serialize(): ComponentData;
  clone(): IElectricalComponent;
  getProperty<T>(key: string): T | undefined;
  setProperty(key: string, value: string | number | boolean): void;
  getTerminals(): Terminal[];
}

export interface Terminal {
  id: string;
  position: Position;
  type: 'input' | 'output' | 'bidirectional';
  connected: boolean;
  connectionId?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ComponentData {
  id: string;
  type: ComponentType;
  position: Position;
  properties: ComponentProperties;
  connections: string[];
}

// Base abstract class for all electrical components
export abstract class BaseElectricalComponent implements IElectricalComponent {
  public id: string;
  public type: ComponentType;
  public position: Position;
  public properties: ComponentProperties;
  public connections: string[];
  public terminals: Terminal[];

  constructor(
    id: string,
    type: ComponentType,
    position: Position,
    properties: ComponentProperties = {}
  ) {
    this.id = id;
    this.type = type;
    this.position = position;
    this.properties = { ...properties };
    this.connections = [];
    this.terminals = this.initializeTerminals();
  }

  protected abstract initializeTerminals(): Terminal[];

  public validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!this.id || this.id.trim() === '') {
      errors.push('Component ID is required');
    }

    if (!this.position || typeof this.position.x !== 'number' || typeof this.position.y !== 'number' || 
        isNaN(this.position.x) || isNaN(this.position.y)) {
      errors.push('Valid position is required');
    }

    // Component-specific validation
    const specificValidation = this.validateSpecific();
    errors.push(...specificValidation.errors);
    warnings.push(...specificValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  protected abstract validateSpecific(): ValidationResult;

  public serialize(): ComponentData {
    return {
      id: this.id,
      type: this.type,
      position: { ...this.position },
      properties: { ...this.properties },
      connections: [...this.connections]
    };
  }

  public abstract clone(): IElectricalComponent;

  public getProperty<T>(key: string): T | undefined {
    return this.properties[key] as T;
  }

  public setProperty(key: string, value: string | number | boolean): void {
    this.properties[key] = value;
  }

  public getTerminals(): Terminal[] {
    return this.terminals;
  }

  protected createTerminal(
    id: string,
    relativePosition: Position,
    type: 'input' | 'output' | 'bidirectional'
  ): Terminal {
    return {
      id,
      position: {
        x: this.position.x + relativePosition.x,
        y: this.position.y + relativePosition.y
      },
      type,
      connected: false
    };
  }
}