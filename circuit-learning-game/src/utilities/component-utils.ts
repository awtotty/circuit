// Utility functions for component property management

import type { ComponentType, Position, ComponentProperties } from '../types';
import type { 
  IElectricalComponent, 
  ValidationResult, 
  ComponentData 
} from '../types/components';
import { Resistor, Battery, LED, Wire } from '../types/electrical-components';

export class ComponentFactory {
  /**
   * Creates a new electrical component based on type
   */
  static createComponent(
    type: ComponentType,
    id: string,
    position: Position,
    properties?: ComponentProperties
  ): IElectricalComponent {
    switch (type) {
      case 'resistor':
        return new Resistor(
          id, 
          position, 
          properties?.resistance as number
        );
      
      case 'battery':
        return new Battery(
          id, 
          position, 
          properties?.voltage as number
        );
      
      case 'led':
        return new LED(
          id, 
          position, 
          properties?.forwardVoltage as number
        );
      
      case 'wire':
        const points = properties?.points ? 
          JSON.parse(properties.points as string) : [];
        return new Wire(id, position, points);
      
      default:
        throw new Error(`Unsupported component type: ${type}`);
    }
  }

  /**
   * Creates a component from serialized data
   */
  static fromData(data: ComponentData): IElectricalComponent {
    return ComponentFactory.createComponent(
      data.type,
      data.id,
      data.position,
      data.properties
    );
  }
}

export class ComponentValidator {
  /**
   * Validates a single component
   */
  static validateComponent(component: IElectricalComponent): ValidationResult {
    return component.validate();
  }

  /**
   * Validates multiple components
   */
  static validateComponents(components: IElectricalComponent[]): ValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    components.forEach((component, index) => {
      const result = component.validate();
      
      if (!result.isValid) {
        allErrors.push(...result.errors.map(error => 
          `Component ${index + 1} (${component.id}): ${error}`
        ));
      }
      
      allWarnings.push(...result.warnings.map(warning => 
        `Component ${index + 1} (${component.id}): ${warning}`
      ));
    });

    // Check for duplicate IDs
    const ids = components.map(c => c.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      allErrors.push(`Duplicate component IDs found: ${duplicateIds.join(', ')}`);
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }
}

export class ComponentSerializer {
  /**
   * Serializes a component to JSON-compatible data
   */
  static serialize(component: IElectricalComponent): ComponentData {
    return component.serialize();
  }

  /**
   * Serializes multiple components
   */
  static serializeComponents(components: IElectricalComponent[]): ComponentData[] {
    return components.map(component => ComponentSerializer.serialize(component));
  }

  /**
   * Deserializes component data back to component instances
   */
  static deserialize(data: ComponentData): IElectricalComponent {
    return ComponentFactory.fromData(data);
  }

  /**
   * Deserializes multiple component data objects
   */
  static deserializeComponents(dataArray: ComponentData[]): IElectricalComponent[] {
    return dataArray.map(data => ComponentSerializer.deserialize(data));
  }
}

export class ComponentPropertyManager {
  /**
   * Gets default properties for a component type
   */
  static getDefaultProperties(type: ComponentType): ComponentProperties {
    switch (type) {
      case 'resistor':
        return { resistance: 1000 };
      
      case 'battery':
        return { voltage: 9 };
      
      case 'led':
        return { 
          forwardVoltage: 2.0,
          isLit: false,
          brightness: 0
        };
      
      case 'wire':
        return { 
          points: JSON.stringify([]),
          resistance: 0.01
        };
      
      case 'capacitor':
        return { capacitance: 0.001 };
      
      case 'switch':
        return { isOpen: false };
      
      default:
        return {};
    }
  }

  /**
   * Validates property values for a component type
   */
  static validateProperty(
    type: ComponentType, 
    key: string, 
    value: string | number | boolean
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (type) {
      case 'resistor':
        if (key === 'resistance') {
          const resistance = Number(value);
          if (isNaN(resistance) || resistance <= 0) {
            errors.push('Resistance must be a positive number');
          } else if (resistance < 1) {
            warnings.push('Very low resistance may cause high current');
          }
        }
        break;
      
      case 'battery':
        if (key === 'voltage') {
          const voltage = Number(value);
          if (isNaN(voltage) || voltage <= 0) {
            errors.push('Voltage must be a positive number');
          } else if (voltage > 12) {
            warnings.push('High voltage may be dangerous in educational context');
          }
        }
        break;
      
      case 'led':
        if (key === 'forwardVoltage') {
          const voltage = Number(value);
          if (isNaN(voltage) || voltage <= 0) {
            errors.push('Forward voltage must be a positive number');
          } else if (voltage > 5) {
            warnings.push('High forward voltage is unusual for standard LEDs');
          }
        } else if (key === 'brightness') {
          const brightness = Number(value);
          if (isNaN(brightness) || brightness < 0 || brightness > 1) {
            errors.push('Brightness must be between 0 and 1');
          }
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Clones component properties
   */
  static cloneProperties(properties: ComponentProperties): ComponentProperties {
    const cloned: ComponentProperties = {};
    
    for (const [key, value] of Object.entries(properties)) {
      cloned[key] = value;
    }
    
    return cloned;
  }
}

/**
 * Utility function to generate unique component IDs
 */
export function generateComponentId(type: ComponentType): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${type}_${timestamp}_${random}`;
}

/**
 * Utility function to calculate distance between two positions
 */
export function calculateDistance(pos1: Position, pos2: Position): number {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Utility function to check if a position is within bounds
 */
export function isPositionInBounds(
  position: Position, 
  bounds: { width: number; height: number }
): boolean {
  return position.x >= 0 && 
         position.x <= bounds.width && 
         position.y >= 0 && 
         position.y <= bounds.height;
}