import React from 'react';
import type { ComponentType } from '../types';
import { generateComponentId } from '../utilities/component-utils';

export interface ComponentPaletteItem {
  type: ComponentType;
  name: string;
  description: string;
  icon: string;
}

export interface ComponentPaletteProps {
  onComponentDragStart?: (componentType: ComponentType, componentId: string) => void;
  onComponentDragEnd?: () => void;
  className?: string;
}

const AVAILABLE_COMPONENTS: ComponentPaletteItem[] = [
  {
    type: 'resistor',
    name: 'Resistor',
    description: 'Limits current flow',
    icon: '⚡'
  },
  {
    type: 'battery',
    name: 'Battery',
    description: 'Provides electrical power',
    icon: '🔋'
  },
  {
    type: 'led',
    name: 'LED',
    description: 'Light emitting diode',
    icon: '💡'
  },
  {
    type: 'wire',
    name: 'Wire',
    description: 'Connects components',
    icon: '➖'
  }
];

export const ComponentPalette: React.FC<ComponentPaletteProps> = ({
  onComponentDragStart,
  onComponentDragEnd,
  className = ''
}) => {
  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, componentType: ComponentType) => {
    const componentId = generateComponentId(componentType);
    
    // Set drag data
    event.dataTransfer.setData('application/json', JSON.stringify({
      componentType,
      componentId
    }));
    
    // Set drag effect
    event.dataTransfer.effectAllowed = 'copy';
    
    // Create ghost image (positioned off-screen to avoid DOM conflicts)
    const ghostElement = event.currentTarget.cloneNode(true) as HTMLElement;
    ghostElement.style.position = 'absolute';
    ghostElement.style.top = '-1000px';
    ghostElement.style.left = '-1000px';
    ghostElement.style.opacity = '0.7';
    ghostElement.style.transform = 'rotate(5deg)';
    ghostElement.style.pointerEvents = 'none';
    // Remove test ID to avoid conflicts
    ghostElement.removeAttribute('data-testid');
    
    document.body.appendChild(ghostElement);
    event.dataTransfer.setDragImage(ghostElement, 50, 25);
    
    // Clean up ghost element after drag starts
    setTimeout(() => {
      if (document.body.contains(ghostElement)) {
        document.body.removeChild(ghostElement);
      }
    }, 100);
    
    if (onComponentDragStart) {
      onComponentDragStart(componentType, componentId);
    }
  };

  const handleDragEnd = () => {
    if (onComponentDragEnd) {
      onComponentDragEnd();
    }
  };

  return (
    <div className={`component-palette ${className}`} data-testid="component-palette">
      <h3 className="palette-title">Components</h3>
      <div className="palette-items">
        {AVAILABLE_COMPONENTS.map((component) => (
          <div
            key={component.type}
            className="palette-item"
            draggable
            onDragStart={(e) => handleDragStart(e, component.type)}
            onDragEnd={handleDragEnd}
            data-testid={`palette-item-${component.type}`}
            title={component.description}
          >
            <div className="item-icon">{component.icon}</div>
            <div className="item-name">{component.name}</div>
          </div>
        ))}
      </div>
      
      <style>{`
        .component-palette {
          background: #f8f9fa;
          border: 2px solid #dee2e6;
          border-radius: 8px;
          padding: 16px;
          min-width: 200px;
          user-select: none;
        }
        
        .palette-title {
          margin: 0 0 12px 0;
          font-size: 18px;
          font-weight: 600;
          color: #343a40;
          text-align: center;
        }
        
        .palette-items {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .palette-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: white;
          border: 2px solid #e9ecef;
          border-radius: 6px;
          cursor: grab;
          transition: all 0.2s ease;
        }
        
        .palette-item:hover {
          border-color: #007bff;
          box-shadow: 0 2px 4px rgba(0, 123, 255, 0.1);
          transform: translateY(-1px);
        }
        
        .palette-item:active {
          cursor: grabbing;
          transform: translateY(0);
        }
        
        .palette-item[draggable="true"]:hover {
          background: #f8f9ff;
        }
        
        .item-icon {
          font-size: 24px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e9ecef;
          border-radius: 4px;
        }
        
        .item-name {
          font-weight: 500;
          color: #495057;
          flex: 1;
        }
        
        .palette-item:hover .item-name {
          color: #007bff;
        }
      `}</style>
    </div>
  );
};

export default ComponentPalette;