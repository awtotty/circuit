// Quick debug test
import { CircuitSimulator } from './src/services/CircuitSimulator.js';
import { Resistor, Battery } from './src/types/electrical-components.js';

const simulator = new CircuitSimulator();

// Create components: Battery (9V) -> Resistor (1000Ω)
const battery = new Battery('battery1', { x: 0, y: 0 }, 9);
const resistor = new Resistor('resistor1', { x: 100, y: 0 }, 1000);

const components = [battery, resistor];
const connections = [
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
console.log('Result:', JSON.stringify(result, null, 2));