// Real-time simulation visualization service

import type { Position, Connection } from '../types';
import type { IElectricalComponent } from '../types/components';
import type { SimulationResult, ComponentState } from './CircuitSimulator';

export interface Particle {
  id: string;
  position: Position;
  velocity: Position;
  connectionId: string;
  progress: number; // 0 to 1 along the connection path
  size: number;
  color: string;
  lifetime: number;
}

export interface AnimationState {
  particles: Particle[];
  lastUpdateTime: number;
  isAnimating: boolean;
  animationSpeed: number; // Multiplier for animation speed
}

export interface VisualizationOptions {
  showCurrentFlow: boolean;
  showVoltageLabels: boolean;
  showCurrentLabels: boolean;
  showResistanceLabels: boolean;
  particleCount: number;
  animationSpeed: number;
  particleSize: number;
}

export class SimulationVisualizer {
  private animationState: AnimationState;
  private options: VisualizationOptions;
  private animationFrameId: number | null = null;
  private onRenderCallback?: () => void;
  private currentComponents: IElectricalComponent[] = [];
  private currentConnections: Connection[] = [];

  constructor(options: Partial<VisualizationOptions> = {}) {
    this.options = {
      showCurrentFlow: true,
      showVoltageLabels: true,
      showCurrentLabels: true,
      showResistanceLabels: false,
      particleCount: 10,
      animationSpeed: 1.0,
      particleSize: 3,
      ...options
    };

    this.animationState = {
      particles: [],
      lastUpdateTime: 0,
      isAnimating: false,
      animationSpeed: this.options.animationSpeed
    };
  }

  /**
   * Start the visualization animation
   */
  public startAnimation(onRender?: () => void): void {
    this.onRenderCallback = onRender;
    this.animationState.isAnimating = true;
    this.animationState.lastUpdateTime = performance.now();
    this.animate();
  }

  /**
   * Stop the visualization animation
   */
  public stopAnimation(): void {
    this.animationState.isAnimating = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Update visualization with new simulation results
   */
  public updateSimulation(
    simulationResult: SimulationResult,
    components: IElectricalComponent[],
    connections: Connection[]
  ): void {
    // Store current components and connections for position calculations
    this.currentComponents = components;
    this.currentConnections = connections;

    if (!simulationResult.isValid) {
      this.clearParticles();
      return;
    }

    // Update particles based on current flow
    this.updateParticles(simulationResult, components, connections);
  }

  /**
   * Render the visualization on canvas
   */
  public render(
    ctx: CanvasRenderingContext2D,
    simulationResult: SimulationResult,
    components: IElectricalComponent[],
    connections: Connection[]
  ): void {
    if (!simulationResult.isValid) return;

    ctx.save();

    // Render current flow particles
    if (this.options.showCurrentFlow) {
      this.renderCurrentFlowParticles(ctx);
    }

    // Render component state visualizations
    this.renderComponentStates(ctx, simulationResult, components);

    // Render electrical value labels
    this.renderElectricalLabels(ctx, simulationResult, components, connections);

    ctx.restore();
  }

  /**
   * Update particle positions and lifecycle
   */
  private updateParticles(
    simulationResult: SimulationResult,
    components: IElectricalComponent[],
    connections: Connection[]
  ): void {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.animationState.lastUpdateTime;
    this.animationState.lastUpdateTime = currentTime;

    // Remove expired particles
    this.animationState.particles = this.animationState.particles.filter(
      particle => particle.lifetime > 0
    );

    // Update existing particles
    for (const particle of this.animationState.particles) {
      this.updateParticle(particle, deltaTime, connections);
    }

    // Create new particles for active connections
    this.createNewParticles(simulationResult, components, connections);
  }

  /**
   * Update a single particle
   */
  private updateParticle(
    particle: Particle,
    deltaTime: number,
    connections: Connection[]
  ): void {
    const connection = connections.find(c => c.id === particle.connectionId);
    if (!connection) {
      particle.lifetime = 0;
      return;
    }

    // Update progress along connection
    const speed = 0.001 * this.animationState.animationSpeed; // pixels per millisecond
    particle.progress += speed * deltaTime;

    // Reset particle if it reaches the end
    if (particle.progress >= 1.0) {
      particle.progress = 0;
    }

    // Update particle position based on progress
    particle.position = this.interpolateConnectionPosition(connection, particle.progress);

    // Update lifetime
    particle.lifetime -= deltaTime;
  }

  /**
   * Create new particles for connections with current flow
   */
  private createNewParticles(
    simulationResult: SimulationResult,
    components: IElectricalComponent[],
    connections: Connection[]
  ): void {
    for (const connection of connections) {
      const fromComponent = components.find(c => c.id === connection.fromComponent);
      const toComponent = components.find(c => c.id === connection.toComponent);
      
      if (!fromComponent || !toComponent) continue;

      const fromState = simulationResult.componentStates.get(connection.fromComponent);
      const toState = simulationResult.componentStates.get(connection.toComponent);
      
      // Check if there's current flow through this connection
      const hasCurrent = (fromState?.current || 0) > 0.001 || (toState?.current || 0) > 0.001;
      
      if (!hasCurrent) continue;

      // Count existing particles for this connection
      const existingParticles = this.animationState.particles.filter(
        p => p.connectionId === connection.id
      ).length;

      // Create new particles if needed
      const targetParticleCount = Math.min(this.options.particleCount, 
        Math.ceil((fromState?.current || 0) * 100)); // Scale particle count with current
      
      if (existingParticles < targetParticleCount) {
        this.createParticle(connection, fromState?.current || 0);
      }
    }
  }

  /**
   * Create a single particle for a connection
   */
  private createParticle(connection: Connection, current: number): void {
    const particle: Particle = {
      id: `particle_${Date.now()}_${Math.random()}`,
      position: this.interpolateConnectionPosition(connection, 0),
      velocity: { x: 0, y: 0 }, // Calculated based on connection direction
      connectionId: connection.id,
      progress: Math.random(), // Random starting position
      size: this.options.particleSize,
      color: this.getParticleColor(current),
      lifetime: 5000 + Math.random() * 3000 // 5-8 seconds
    };

    this.animationState.particles.push(particle);
  }

  /**
   * Get particle color based on current intensity
   */
  private getParticleColor(current: number): string {
    // Color particles based on current intensity
    const intensity = Math.min(current * 50, 1); // Scale current to 0-1
    
    if (intensity < 0.3) {
      return '#28a745'; // Green for low current
    } else if (intensity < 0.7) {
      return '#ffc107'; // Yellow for medium current
    } else {
      return '#dc3545'; // Red for high current
    }
  }

  /**
   * Interpolate position along a connection path
   */
  private interpolateConnectionPosition(connection: Connection, progress: number): Position {
    // Store components reference for position calculation
    if (!this.currentComponents) {
      return { x: 0, y: 0 };
    }

    const positions = this.getConnectionTerminalPositions(connection, this.currentComponents);
    if (!positions) {
      return { x: 0, y: 0 };
    }

    return {
      x: positions.start.x + (positions.end.x - positions.start.x) * progress,
      y: positions.start.y + (positions.end.y - positions.start.y) * progress
    };
  }

  /**
   * Get actual terminal positions for a connection
   */
  private getConnectionTerminalPositions(
    connection: Connection,
    components: IElectricalComponent[]
  ): { start: Position; end: Position } | null {
    const fromComponent = components.find(c => c.id === connection.fromComponent);
    const toComponent = components.find(c => c.id === connection.toComponent);
    
    if (!fromComponent || !toComponent) return null;
    
    const fromTerminal = fromComponent.terminals.find(t => t.id === connection.fromTerminal);
    const toTerminal = toComponent.terminals.find(t => t.id === connection.toTerminal);
    
    if (!fromTerminal || !toTerminal) return null;
    
    return {
      start: fromTerminal.position,
      end: toTerminal.position
    };
  }

  /**
   * Render current flow particles
   */
  private renderCurrentFlowParticles(ctx: CanvasRenderingContext2D): void {
    for (const particle of this.animationState.particles) {
      ctx.save();
      
      // Set particle appearance
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = Math.min(particle.lifetime / 1000, 1); // Fade out over time
      
      // Draw particle
      ctx.beginPath();
      ctx.arc(particle.position.x, particle.position.y, particle.size, 0, 2 * Math.PI);
      ctx.fill();
      
      // Add glow effect
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = particle.size * 2;
      ctx.fill();
      
      ctx.restore();
    }
  }

  /**
   * Render component state visualizations
   */
  private renderComponentStates(
    ctx: CanvasRenderingContext2D,
    simulationResult: SimulationResult,
    components: IElectricalComponent[]
  ): void {
    for (const component of components) {
      const state = simulationResult.componentStates.get(component.id);
      if (!state) continue;

      if (component.type === 'led') {
        this.renderLEDState(ctx, component, state);
      } else if (component.type === 'resistor') {
        this.renderResistorState(ctx, component, state);
      } else if (component.type === 'battery') {
        this.renderBatteryState(ctx, component, state);
      }
    }
  }

  /**
   * Render LED brightness visualization
   */
  private renderLEDState(
    ctx: CanvasRenderingContext2D,
    component: IElectricalComponent,
    state: ComponentState
  ): void {
    if (!state.isActive) return;

    const brightness = state.additionalProperties?.brightness || 0;
    if (brightness <= 0) return;

    ctx.save();
    
    // Move to LED position
    ctx.translate(component.position.x, component.position.y);
    
    // Create radial gradient for glow effect
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 30 * brightness);
    gradient.addColorStop(0, `rgba(255, 255, 0, ${brightness * 0.8})`);
    gradient.addColorStop(0.5, `rgba(255, 255, 0, ${brightness * 0.4})`);
    gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 30 * brightness, 0, 2 * Math.PI);
    ctx.fill();
    
    // Add light rays
    ctx.strokeStyle = `rgba(255, 255, 0, ${brightness * 0.6})`;
    ctx.lineWidth = 2;
    
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const innerRadius = 15;
      const outerRadius = 25 + brightness * 10;
      
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
      ctx.lineTo(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  /**
   * Render resistor heat visualization
   */
  private renderResistorState(
    ctx: CanvasRenderingContext2D,
    component: IElectricalComponent,
    state: ComponentState
  ): void {
    if (state.power <= 0.01) return; // Only show heat for significant power

    ctx.save();
    
    // Move to resistor position
    ctx.translate(component.position.x, component.position.y);
    
    // Heat visualization based on power dissipation
    const heatIntensity = Math.min(state.power / 0.5, 1); // Scale to 0-1
    
    // Create heat shimmer effect
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
    gradient.addColorStop(0, `rgba(255, 100, 0, ${heatIntensity * 0.3})`);
    gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.restore();
  }

  /**
   * Render battery state visualization
   */
  private renderBatteryState(
    ctx: CanvasRenderingContext2D,
    component: IElectricalComponent,
    state: ComponentState
  ): void {
    if (!state.isActive) return;

    // Could add battery charge level visualization here
    // For now, just indicate active state with a subtle glow
    ctx.save();
    
    ctx.translate(component.position.x, component.position.y);
    
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-25, -15, 50, 30);
    ctx.stroke();
    
    ctx.restore();
  }

  /**
   * Render electrical value labels
   */
  private renderElectricalLabels(
    ctx: CanvasRenderingContext2D,
    simulationResult: SimulationResult,
    components: IElectricalComponent[],
    connections: Connection[]
  ): void {
    ctx.save();
    
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (const component of components) {
      const state = simulationResult.componentStates.get(component.id);
      if (!state) continue;

      const labels: string[] = [];
      
      if (this.options.showVoltageLabels && Math.abs(state.voltage) > 0.01) {
        labels.push(`${state.voltage.toFixed(2)}V`);
      }
      
      if (this.options.showCurrentLabels && Math.abs(state.current) > 0.001) {
        labels.push(`${(state.current * 1000).toFixed(1)}mA`);
      }
      
      if (this.options.showResistanceLabels && component.type === 'resistor') {
        const resistance = component.getProperty<number>('resistance') || 0;
        if (resistance >= 1000) {
          labels.push(`${(resistance / 1000).toFixed(1)}kΩ`);
        } else {
          labels.push(`${resistance.toFixed(0)}Ω`);
        }
      }
      
      // Render labels
      labels.forEach((label, index) => {
        const yOffset = -30 - (index * 15);
        
        // Background for better readability
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        const textWidth = ctx.measureText(label).width;
        ctx.fillRect(
          component.position.x - textWidth / 2 - 2,
          component.position.y + yOffset - 8,
          textWidth + 4,
          16
        );
        
        // Text
        ctx.fillStyle = '#333';
        ctx.fillText(label, component.position.x, component.position.y + yOffset);
      });
    }
    
    ctx.restore();
  }

  /**
   * Animation loop
   */
  private animate = (): void => {
    if (!this.animationState.isAnimating) return;

    // Trigger render callback
    if (this.onRenderCallback) {
      this.onRenderCallback();
    }

    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  /**
   * Clear all particles
   */
  private clearParticles(): void {
    this.animationState.particles = [];
  }

  /**
   * Update visualization options
   */
  public updateOptions(options: Partial<VisualizationOptions>): void {
    this.options = { ...this.options, ...options };
    this.animationState.animationSpeed = this.options.animationSpeed;
  }

  /**
   * Get current options
   */
  public getOptions(): VisualizationOptions {
    return { ...this.options };
  }

  /**
   * Get animation state for debugging
   */
  public getAnimationState(): AnimationState {
    return {
      ...this.animationState,
      particles: [...this.animationState.particles]
    };
  }
}