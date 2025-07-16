// Component rendering system for electrical components

import type { Position, ComponentType } from '../types';
import type { IElectricalComponent } from '../types/components';

export interface RenderingContext {
  ctx: CanvasRenderingContext2D;
  gridSize: number;
  scale: number;
}

export interface ComponentSprite {
  width: number;
  height: number;
  render: (ctx: CanvasRenderingContext2D, position: Position, selected: boolean, highlighted: boolean) => void;
}

export interface SelectionState {
  selectedComponents: Set<string>;
  highlightedComponent: string | null;
}

export class ComponentRenderer {
  private sprites: Map<ComponentType, ComponentSprite> = new Map();
  private selectionState: SelectionState = {
    selectedComponents: new Set(),
    highlightedComponent: null
  };

  constructor() {
    this.initializeSprites();
  }

  /**
   * Initialize component sprites
   */
  private initializeSprites(): void {
    this.sprites.set('resistor', this.createResistorSprite());
    this.sprites.set('battery', this.createBatterySprite());
    this.sprites.set('led', this.createLEDSprite());
    this.sprites.set('wire', this.createWireSprite());
    this.sprites.set('capacitor', this.createCapacitorSprite());
    this.sprites.set('switch', this.createSwitchSprite());
  }

  /**
   * Render a single component
   */
  public renderComponent(
    component: IElectricalComponent,
    context: RenderingContext
  ): void {
    const sprite = this.sprites.get(component.type);
    if (!sprite) {
      console.warn(`No sprite found for component type: ${component.type}`);
      return;
    }

    const isSelected = this.selectionState.selectedComponents.has(component.id);
    const isHighlighted = this.selectionState.highlightedComponent === component.id;

    // Save context state
    context.ctx.save();

    // Apply scaling
    context.ctx.scale(context.scale, context.scale);

    // Render the component
    sprite.render(context.ctx, component.position, isSelected, isHighlighted);

    // Render terminals if component is selected
    if (isSelected) {
      this.renderTerminals(component, context);
    }

    // Restore context state
    context.ctx.restore();
  }

  /**
   * Render multiple components
   */
  public renderComponents(
    components: IElectricalComponent[],
    context: RenderingContext
  ): void {
    // Sort components by type to ensure consistent rendering order
    const sortedComponents = [...components].sort((a, b) => {
      const order = ['wire', 'resistor', 'capacitor', 'battery', 'led', 'switch'];
      return order.indexOf(a.type) - order.indexOf(b.type);
    });

    sortedComponents.forEach(component => {
      this.renderComponent(component, context);
    });
  }

  /**
   * Render component terminals
   */
  private renderTerminals(
    component: IElectricalComponent,
    context: RenderingContext
  ): void {
    const { ctx } = context;
    
    component.terminals.forEach(terminal => {
      ctx.save();
      
      // Terminal styling
      ctx.fillStyle = terminal.connected ? '#28a745' : '#6c757d';
      ctx.strokeStyle = '#343a40';
      ctx.lineWidth = 1;
      
      // Draw terminal circle
      ctx.beginPath();
      ctx.arc(terminal.position.x, terminal.position.y, 3, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      
      ctx.restore();
    });
  }

  /**
   * Create resistor sprite
   */
  private createResistorSprite(): ComponentSprite {
    return {
      width: 40,
      height: 12,
      render: (ctx: CanvasRenderingContext2D, position: Position, selected: boolean, highlighted: boolean) => {
        ctx.save();
        
        // Move to component position
        ctx.translate(position.x, position.y);
        
        // Selection/highlight background
        if (selected || highlighted) {
          ctx.fillStyle = selected ? 'rgba(0, 123, 255, 0.2)' : 'rgba(255, 193, 7, 0.2)';
          ctx.fillRect(-25, -10, 50, 20);
        }
        
        // Resistor body
        ctx.fillStyle = '#d4af37';
        ctx.strokeStyle = '#8b7355';
        ctx.lineWidth = 2;
        
        // Draw zigzag pattern
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(-15, -6);
        ctx.lineTo(-10, 6);
        ctx.lineTo(-5, -6);
        ctx.lineTo(0, 6);
        ctx.lineTo(5, -6);
        ctx.lineTo(10, 6);
        ctx.lineTo(15, -6);
        ctx.lineTo(20, 0);
        ctx.stroke();
        
        // Connection lines
        ctx.beginPath();
        ctx.moveTo(-25, 0);
        ctx.lineTo(-20, 0);
        ctx.moveTo(20, 0);
        ctx.lineTo(25, 0);
        ctx.stroke();
        
        ctx.restore();
      }
    };
  }

  /**
   * Create battery sprite
   */
  private createBatterySprite(): ComponentSprite {
    return {
      width: 40,
      height: 20,
      render: (ctx: CanvasRenderingContext2D, position: Position, selected: boolean, highlighted: boolean) => {
        ctx.save();
        
        // Move to component position
        ctx.translate(position.x, position.y);
        
        // Selection/highlight background
        if (selected || highlighted) {
          ctx.fillStyle = selected ? 'rgba(0, 123, 255, 0.2)' : 'rgba(255, 193, 7, 0.2)';
          ctx.fillRect(-25, -15, 50, 30);
        }
        
        ctx.strokeStyle = '#343a40';
        ctx.lineWidth = 3;
        
        // Positive terminal (longer line)
        ctx.beginPath();
        ctx.moveTo(8, -12);
        ctx.lineTo(8, 12);
        ctx.stroke();
        
        // Negative terminal (shorter line)
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-8, -8);
        ctx.lineTo(-8, 8);
        ctx.stroke();
        
        // Connection lines
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-25, 0);
        ctx.lineTo(-8, 0);
        ctx.moveTo(8, 0);
        ctx.lineTo(25, 0);
        ctx.stroke();
        
        // Labels
        ctx.fillStyle = '#dc3545';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('+', 15, -15);
        ctx.fillText('-', -15, -15);
        
        ctx.restore();
      }
    };
  }

  /**
   * Create LED sprite
   */
  private createLEDSprite(): ComponentSprite {
    return {
      width: 30,
      height: 30,
      render: (ctx: CanvasRenderingContext2D, position: Position, selected: boolean, highlighted: boolean) => {
        ctx.save();
        
        // Move to component position
        ctx.translate(position.x, position.y);
        
        // Selection/highlight background
        if (selected || highlighted) {
          ctx.fillStyle = selected ? 'rgba(0, 123, 255, 0.2)' : 'rgba(255, 193, 7, 0.2)';
          ctx.fillRect(-20, -20, 40, 40);
        }
        
        // LED body (triangle)
        ctx.fillStyle = '#dc3545';
        ctx.strokeStyle = '#721c24';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(-8, -8);
        ctx.lineTo(8, 0);
        ctx.lineTo(-8, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // LED cathode line
        ctx.beginPath();
        ctx.moveTo(8, -8);
        ctx.lineTo(8, 8);
        ctx.stroke();
        
        // Connection lines
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(-8, 0);
        ctx.moveTo(8, 0);
        ctx.lineTo(20, 0);
        ctx.stroke();
        
        // Light rays if LED is lit (check component properties)
        // This would be enhanced with actual component state
        ctx.strokeStyle = '#ffc107';
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const x1 = Math.cos(angle) * 12;
          const y1 = Math.sin(angle) * 12;
          const x2 = Math.cos(angle) * 18;
          const y2 = Math.sin(angle) * 18;
          
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        
        ctx.restore();
      }
    };
  }

  /**
   * Create wire sprite
   */
  private createWireSprite(): ComponentSprite {
    return {
      width: 0, // Dynamic based on wire path
      height: 0, // Dynamic based on wire path
      render: (ctx: CanvasRenderingContext2D, position: Position, selected: boolean, highlighted: boolean) => {
        ctx.save();
        
        // Wire rendering would be handled differently as it's path-based
        // This is a placeholder for the wire rendering logic
        ctx.strokeStyle = selected ? '#007bff' : (highlighted ? '#ffc107' : '#28a745');
        ctx.lineWidth = selected ? 3 : 2;
        
        // Simple line for now - would be enhanced with actual wire path
        ctx.beginPath();
        ctx.moveTo(position.x - 20, position.y);
        ctx.lineTo(position.x + 20, position.y);
        ctx.stroke();
        
        ctx.restore();
      }
    };
  }

  /**
   * Create capacitor sprite
   */
  private createCapacitorSprite(): ComponentSprite {
    return {
      width: 30,
      height: 20,
      render: (ctx: CanvasRenderingContext2D, position: Position, selected: boolean, highlighted: boolean) => {
        ctx.save();
        
        // Move to component position
        ctx.translate(position.x, position.y);
        
        // Selection/highlight background
        if (selected || highlighted) {
          ctx.fillStyle = selected ? 'rgba(0, 123, 255, 0.2)' : 'rgba(255, 193, 7, 0.2)';
          ctx.fillRect(-20, -15, 40, 30);
        }
        
        ctx.strokeStyle = '#343a40';
        ctx.lineWidth = 3;
        
        // Capacitor plates
        ctx.beginPath();
        ctx.moveTo(-3, -10);
        ctx.lineTo(-3, 10);
        ctx.moveTo(3, -10);
        ctx.lineTo(3, 10);
        ctx.stroke();
        
        // Connection lines
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(-3, 0);
        ctx.moveTo(3, 0);
        ctx.lineTo(20, 0);
        ctx.stroke();
        
        ctx.restore();
      }
    };
  }

  /**
   * Create switch sprite
   */
  private createSwitchSprite(): ComponentSprite {
    return {
      width: 40,
      height: 20,
      render: (ctx: CanvasRenderingContext2D, position: Position, selected: boolean, highlighted: boolean) => {
        ctx.save();
        
        // Move to component position
        ctx.translate(position.x, position.y);
        
        // Selection/highlight background
        if (selected || highlighted) {
          ctx.fillStyle = selected ? 'rgba(0, 123, 255, 0.2)' : 'rgba(255, 193, 7, 0.2)';
          ctx.fillRect(-25, -15, 50, 30);
        }
        
        ctx.strokeStyle = '#343a40';
        ctx.lineWidth = 2;
        
        // Switch contacts
        ctx.fillStyle = '#6c757d';
        ctx.beginPath();
        ctx.arc(-15, 0, 3, 0, 2 * Math.PI);
        ctx.arc(15, 0, 3, 0, 2 * Math.PI);
        ctx.fill();
        
        // Switch lever (open position for now)
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.lineTo(10, -8);
        ctx.stroke();
        
        // Connection lines
        ctx.beginPath();
        ctx.moveTo(-25, 0);
        ctx.lineTo(-18, 0);
        ctx.moveTo(18, 0);
        ctx.lineTo(25, 0);
        ctx.stroke();
        
        ctx.restore();
      }
    };
  }

  /**
   * Select a component
   */
  public selectComponent(componentId: string): void {
    this.selectionState.selectedComponents.add(componentId);
  }

  /**
   * Deselect a component
   */
  public deselectComponent(componentId: string): void {
    this.selectionState.selectedComponents.delete(componentId);
  }

  /**
   * Clear all selections
   */
  public clearSelection(): void {
    this.selectionState.selectedComponents.clear();
  }

  /**
   * Toggle component selection
   */
  public toggleSelection(componentId: string): void {
    if (this.selectionState.selectedComponents.has(componentId)) {
      this.deselectComponent(componentId);
    } else {
      this.selectComponent(componentId);
    }
  }

  /**
   * Set highlighted component
   */
  public setHighlighted(componentId: string | null): void {
    this.selectionState.highlightedComponent = componentId;
  }

  /**
   * Get selection state
   */
  public getSelectionState(): SelectionState {
    return {
      selectedComponents: new Set(this.selectionState.selectedComponents),
      highlightedComponent: this.selectionState.highlightedComponent
    };
  }

  /**
   * Check if component is selected
   */
  public isSelected(componentId: string): boolean {
    return this.selectionState.selectedComponents.has(componentId);
  }

  /**
   * Check if component is highlighted
   */
  public isHighlighted(componentId: string): boolean {
    return this.selectionState.highlightedComponent === componentId;
  }

  /**
   * Get component at position (for hit testing)
   */
  public getComponentAtPosition(
    components: IElectricalComponent[],
    position: Position,
    tolerance: number = 10
  ): IElectricalComponent | null {
    // Check components in reverse order (top to bottom)
    for (let i = components.length - 1; i >= 0; i--) {
      const component = components[i];
      const sprite = this.sprites.get(component.type);
      
      if (!sprite) continue;
      
      // Simple bounding box hit test
      const dx = Math.abs(position.x - component.position.x);
      const dy = Math.abs(position.y - component.position.y);
      
      if (dx <= sprite.width / 2 + tolerance && dy <= sprite.height / 2 + tolerance) {
        return component;
      }
    }
    
    return null;
  }
}