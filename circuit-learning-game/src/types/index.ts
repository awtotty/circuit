// Core type definitions for the circuit learning game

export interface Position {
  x: number;
  y: number;
}

export interface Component {
  id: string;
  type: ComponentType;
  position: Position;
  properties: ComponentProperties;
  connections: string[];
}

export interface Connection {
  id: string;
  fromComponent: string;
  toComponent: string;
  fromTerminal: string;
  toTerminal: string;
}

export interface Circuit {
  id: string;
  name: string;
  components: Component[];
  connections: Connection[];
  metadata: CircuitMetadata;
}

export type ComponentType =
  | 'resistor'
  | 'capacitor'
  | 'battery'
  | 'led'
  | 'switch'
  | 'wire';

export interface ComponentProperties {
  [key: string]: string | number | boolean;
}

export interface CircuitMetadata {
  createdAt: Date;
  lastModified: Date;
  author?: string;
  description?: string;
}

// Re-export component types and classes
export * from './components';
export * from './electrical-components';
