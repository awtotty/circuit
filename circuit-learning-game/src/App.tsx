import { useState } from 'react';
import { CircuitBoard, ComponentPalette } from './components';
import type { Position, ComponentType } from './types';
import { ComponentFactory } from './utilities/component-utils';
import type { IElectricalComponent } from './types/components';
import './App.css';

function App() {
  const [clickedPosition, setClickedPosition] = useState<Position | null>(null);
  const [droppedComponents, setDroppedComponents] = useState<IElectricalComponent[]>([]);
  const [draggedComponent, setDraggedComponent] = useState<{
    type: ComponentType;
    id: string;
  } | null>(null);

  const handleCanvasClick = (position: Position) => {
    setClickedPosition(position);
    console.log('Canvas clicked at:', position);
  };

  const handleCanvasMouseMove = (_position: Position) => {
    // Optional: Handle mouse move events
  };

  const handleComponentDragStart = (componentType: ComponentType, componentId: string) => {
    setDraggedComponent({ type: componentType, id: componentId });
    console.log('Started dragging:', componentType, componentId);
  };

  const handleComponentDragEnd = () => {
    setDraggedComponent(null);
    console.log('Finished dragging');
  };

  const handleComponentDrop = (componentType: ComponentType, componentId: string, position: Position) => {
    try {
      const newComponent = ComponentFactory.createComponent(componentType, componentId, position);
      setDroppedComponents(prev => [...prev, newComponent]);
      console.log('Dropped component:', componentType, 'at position:', position);
    } catch (error) {
      console.error('Failed to create component:', error);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Circuit Learning Game</h1>
      <p>Drag components from the palette to the circuit board</p>
      
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        <ComponentPalette
          onComponentDragStart={handleComponentDragStart}
          onComponentDragEnd={handleComponentDragEnd}
        />
        
        <div>
          <CircuitBoard
            width={800}
            height={600}
            gridSize={20}
            onCanvasClick={handleCanvasClick}
            onCanvasMouseMove={handleCanvasMouseMove}
            onComponentDrop={handleComponentDrop}
          />
          
          {clickedPosition && (
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
              Last clicked position: ({clickedPosition.x}, {clickedPosition.y})
            </div>
          )}
        </div>
      </div>

      {draggedComponent && (
        <div style={{ 
          position: 'fixed', 
          top: '10px', 
          right: '10px', 
          padding: '10px', 
          backgroundColor: '#007bff', 
          color: 'white', 
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          Dragging: {draggedComponent.type}
        </div>
      )}

      {droppedComponents.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>Placed Components ({droppedComponents.length})</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
            {droppedComponents.map((component, index) => (
              <div key={index} style={{ 
                padding: '10px', 
                backgroundColor: '#f8f9fa', 
                border: '1px solid #dee2e6', 
                borderRadius: '4px' 
              }}>
                <strong>{component.type}</strong><br />
                ID: {component.id}<br />
                Position: ({component.position.x}, {component.position.y})<br />
                {component.type === 'resistor' && (
                  <span>Resistance: {component.getProperty('resistance')}Ω</span>
                )}
                {component.type === 'battery' && (
                  <span>Voltage: {component.getProperty('voltage')}V</span>
                )}
                {component.type === 'led' && (
                  <span>Forward Voltage: {component.getProperty('forwardVoltage')}V</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
