// Application constants

export const GRID_SIZE = 20;
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const COMPONENT_TYPES = {
  RESISTOR: 'resistor',
  CAPACITOR: 'capacitor',
  BATTERY: 'battery',
  LED: 'led',
  SWITCH: 'switch',
  WIRE: 'wire',
} as const;

export const DEFAULT_COMPONENT_PROPERTIES = {
  resistor: { resistance: 100 },
  capacitor: { capacitance: 0.001 },
  battery: { voltage: 9 },
  led: { color: 'red' },
  switch: { closed: false },
  wire: {},
} as const;
