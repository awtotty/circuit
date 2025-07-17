// Visual highlighting service for circuit errors and warnings

import type { CircuitError, HighlightInfo } from './CircuitValidator';

export interface HighlightStyle {
  color: string;
  strokeWidth: number;
  strokeDashArray?: string;
  opacity: number;
  animation?: 'pulse' | 'blink' | 'glow';
  animationDuration?: number;
}

export interface ComponentHighlight {
  componentId: string;
  style: HighlightStyle;
  message: string;
  severity: 'error' | 'warning' | 'info';
  educationalExplanation?: string;
  suggestedFix?: string;
}

export interface ConnectionHighlight {
  connectionId: string;
  style: HighlightStyle;
  message: string;
  severity: 'error' | 'warning' | 'info';
  educationalExplanation?: string;
  suggestedFix?: string;
}

export interface AreaHighlight {
  bounds: { x: number; y: number; width: number; height: number };
  style: HighlightStyle;
  message: string;
  severity: 'error' | 'warning' | 'info';
  educationalExplanation?: string;
  suggestedFix?: string;
}

export class ErrorHighlighter {
  private componentHighlights = new Map<string, ComponentHighlight>();
  private connectionHighlights = new Map<string, ConnectionHighlight>();
  private areaHighlights: AreaHighlight[] = [];
  private highlightCallbacks = new Set<() => void>();

  /**
   * Convert circuit errors to visual highlights
   */
  public processErrors(errors: CircuitError[]): void {
    this.clearAllHighlights();

    for (const error of errors) {
      if (error.visualHighlight) {
        this.addHighlightFromError(error);
      }
    }

    this.notifyHighlightChange();
  }

  /**
   * Add a highlight based on a circuit error
   */
  private addHighlightFromError(error: CircuitError): void {
    const highlight = error.visualHighlight!;
    const style = this.createStyleFromHighlight(highlight, error.severity);

    switch (highlight.type) {
      case 'component':
        for (const componentId of highlight.targets) {
          this.componentHighlights.set(componentId, {
            componentId,
            style,
            message: error.message,
            severity: error.severity,
            educationalExplanation: error.educationalExplanation,
            suggestedFix: error.suggestedFix
          });
        }
        break;

      case 'connection':
        for (const connectionId of highlight.targets) {
          this.connectionHighlights.set(connectionId, {
            connectionId,
            style,
            message: error.message,
            severity: error.severity,
            educationalExplanation: error.educationalExplanation,
            suggestedFix: error.suggestedFix
          });
        }
        break;

      case 'area':
        // For area highlights, we'll create a general highlight
        this.areaHighlights.push({
          bounds: { x: 0, y: 0, width: 800, height: 600 }, // Default canvas size
          style,
          message: error.message,
          severity: error.severity,
          educationalExplanation: error.educationalExplanation,
          suggestedFix: error.suggestedFix
        });
        break;
    }
  }

  /**
   * Create visual style from highlight info
   */
  private createStyleFromHighlight(highlight: HighlightInfo, severity: 'error' | 'warning' | 'info'): HighlightStyle {
    const baseStyle: HighlightStyle = {
      color: highlight.color,
      strokeWidth: this.getStrokeWidthForSeverity(severity),
      opacity: 0.8
    };

    // Set stroke pattern based on style
    switch (highlight.style) {
      case 'dashed':
        baseStyle.strokeDashArray = '5,5';
        break;
      case 'pulsing':
        baseStyle.animation = 'pulse';
        baseStyle.animationDuration = 1000;
        break;
      case 'solid':
      default:
        // No additional styling needed
        break;
    }

    return baseStyle;
  }

  /**
   * Get stroke width based on error severity
   */
  private getStrokeWidthForSeverity(severity: 'error' | 'warning' | 'info'): number {
    switch (severity) {
      case 'error':
        return 4;
      case 'warning':
        return 3;
      case 'info':
        return 2;
      default:
        return 2;
    }
  }

  /**
   * Get highlight for a specific component
   */
  public getComponentHighlight(componentId: string): ComponentHighlight | undefined {
    return this.componentHighlights.get(componentId);
  }

  /**
   * Get highlight for a specific connection
   */
  public getConnectionHighlight(connectionId: string): ConnectionHighlight | undefined {
    return this.connectionHighlights.get(connectionId);
  }

  /**
   * Get all component highlights
   */
  public getAllComponentHighlights(): ComponentHighlight[] {
    return Array.from(this.componentHighlights.values());
  }

  /**
   * Get all connection highlights
   */
  public getAllConnectionHighlights(): ConnectionHighlight[] {
    return Array.from(this.connectionHighlights.values());
  }

  /**
   * Get all area highlights
   */
  public getAllAreaHighlights(): AreaHighlight[] {
    return [...this.areaHighlights];
  }

  /**
   * Check if a component has any highlight
   */
  public hasComponentHighlight(componentId: string): boolean {
    return this.componentHighlights.has(componentId);
  }

  /**
   * Check if a connection has any highlight
   */
  public hasConnectionHighlight(connectionId: string): boolean {
    return this.connectionHighlights.has(connectionId);
  }

  /**
   * Clear all highlights
   */
  public clearAllHighlights(): void {
    this.componentHighlights.clear();
    this.connectionHighlights.clear();
    this.areaHighlights = [];
  }

  /**
   * Clear highlights for a specific component
   */
  public clearComponentHighlight(componentId: string): void {
    this.componentHighlights.delete(componentId);
    this.notifyHighlightChange();
  }

  /**
   * Clear highlights for a specific connection
   */
  public clearConnectionHighlight(connectionId: string): void {
    this.connectionHighlights.delete(connectionId);
    this.notifyHighlightChange();
  }

  /**
   * Add a custom component highlight
   */
  public addComponentHighlight(
    componentId: string,
    style: HighlightStyle,
    message: string,
    severity: 'error' | 'warning' | 'info' = 'info',
    educationalExplanation?: string,
    suggestedFix?: string
  ): void {
    this.componentHighlights.set(componentId, {
      componentId,
      style,
      message,
      severity,
      educationalExplanation,
      suggestedFix
    });
    this.notifyHighlightChange();
  }

  /**
   * Add a custom connection highlight
   */
  public addConnectionHighlight(
    connectionId: string,
    style: HighlightStyle,
    message: string,
    severity: 'error' | 'warning' | 'info' = 'info',
    educationalExplanation?: string,
    suggestedFix?: string
  ): void {
    this.connectionHighlights.set(connectionId, {
      connectionId,
      style,
      message,
      severity,
      educationalExplanation,
      suggestedFix
    });
    this.notifyHighlightChange();
  }

  /**
   * Subscribe to highlight changes
   */
  public onHighlightChange(callback: () => void): () => void {
    this.highlightCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.highlightCallbacks.delete(callback);
    };
  }

  /**
   * Notify all subscribers of highlight changes
   */
  private notifyHighlightChange(): void {
    for (const callback of this.highlightCallbacks) {
      callback();
    }
  }

  /**
   * Get CSS styles for component highlighting (for HTML/CSS rendering)
   */
  public getComponentCSSStyle(componentId: string): React.CSSProperties | undefined {
    const highlight = this.getComponentHighlight(componentId);
    if (!highlight) return undefined;

    const style: React.CSSProperties = {
      outline: `${highlight.style.strokeWidth}px solid ${highlight.style.color}`,
      outlineOffset: '2px',
      opacity: highlight.style.opacity
    };

    if (highlight.style.strokeDashArray) {
      style.outlineStyle = 'dashed';
    }

    if (highlight.style.animation === 'pulse') {
      style.animation = `pulse ${highlight.style.animationDuration || 1000}ms infinite`;
    }

    return style;
  }

  /**
   * Get Canvas drawing instructions for component highlighting
   */
  public drawComponentHighlight(
    ctx: CanvasRenderingContext2D,
    componentId: string,
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    const highlight = this.getComponentHighlight(componentId);
    if (!highlight) return;

    ctx.save();
    
    // Set up stroke style
    ctx.strokeStyle = highlight.style.color;
    ctx.lineWidth = highlight.style.strokeWidth;
    ctx.globalAlpha = highlight.style.opacity;

    if (highlight.style.strokeDashArray) {
      const dashArray = highlight.style.strokeDashArray.split(',').map(n => parseInt(n.trim()));
      ctx.setLineDash(dashArray);
    }

    // Draw highlight rectangle around component
    const padding = 5;
    ctx.strokeRect(
      bounds.x - padding,
      bounds.y - padding,
      bounds.width + padding * 2,
      bounds.height + padding * 2
    );

    ctx.restore();
  }

  /**
   * Get Canvas drawing instructions for connection highlighting
   */
  public drawConnectionHighlight(
    ctx: CanvasRenderingContext2D,
    connectionId: string,
    path: { x: number; y: number }[]
  ): void {
    const highlight = this.getConnectionHighlight(connectionId);
    if (!highlight || path.length < 2) return;

    ctx.save();
    
    // Set up stroke style
    ctx.strokeStyle = highlight.style.color;
    ctx.lineWidth = highlight.style.strokeWidth;
    ctx.globalAlpha = highlight.style.opacity;

    if (highlight.style.strokeDashArray) {
      const dashArray = highlight.style.strokeDashArray.split(',').map(n => parseInt(n.trim()));
      ctx.setLineDash(dashArray);
    }

    // Draw highlighted path
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Get educational explanation for a highlighted component
   */
  public getComponentEducationalContent(componentId: string): {
    message: string;
    explanation: string;
    suggestedFix?: string;
    severity: 'error' | 'warning' | 'info';
  } | undefined {
    const highlight = this.getComponentHighlight(componentId);
    if (!highlight) return undefined;

    return {
      message: highlight.message,
      explanation: highlight.educationalExplanation || 'No detailed explanation available.',
      suggestedFix: highlight.suggestedFix,
      severity: highlight.severity
    };
  }

  /**
   * Get educational explanation for a highlighted connection
   */
  public getConnectionEducationalContent(connectionId: string): {
    message: string;
    explanation: string;
    suggestedFix?: string;
    severity: 'error' | 'warning' | 'info';
  } | undefined {
    const highlight = this.getConnectionHighlight(connectionId);
    if (!highlight) return undefined;

    return {
      message: highlight.message,
      explanation: highlight.educationalExplanation || 'No detailed explanation available.',
      suggestedFix: highlight.suggestedFix,
      severity: highlight.severity
    };
  }

  /**
   * Get all educational content for current highlights
   * Useful for displaying a summary of all circuit issues
   */
  public getAllEducationalContent(): Array<{
    id: string;
    type: 'component' | 'connection' | 'area';
    message: string;
    explanation: string;
    suggestedFix?: string;
    severity: 'error' | 'warning' | 'info';
  }> {
    const content: Array<{
      id: string;
      type: 'component' | 'connection' | 'area';
      message: string;
      explanation: string;
      suggestedFix?: string;
      severity: 'error' | 'warning' | 'info';
    }> = [];

    // Add component highlights
    for (const [id, highlight] of this.componentHighlights.entries()) {
      content.push({
        id,
        type: 'component',
        message: highlight.message,
        explanation: highlight.educationalExplanation || 'No detailed explanation available.',
        suggestedFix: highlight.suggestedFix,
        severity: highlight.severity
      });
    }

    // Add connection highlights
    for (const [id, highlight] of this.connectionHighlights.entries()) {
      content.push({
        id,
        type: 'connection',
        message: highlight.message,
        explanation: highlight.educationalExplanation || 'No detailed explanation available.',
        suggestedFix: highlight.suggestedFix,
        severity: highlight.severity
      });
    }

    // Add area highlights
    for (const highlight of this.areaHighlights) {
      content.push({
        id: `area_${content.length}`,
        type: 'area',
        message: highlight.message,
        explanation: highlight.educationalExplanation || 'No detailed explanation available.',
        suggestedFix: highlight.suggestedFix,
        severity: highlight.severity
      });
    }

    return content;
  }

  /**
   * Get summary of current highlights for debugging
   */
  public getHighlightSummary(): {
    componentCount: number;
    connectionCount: number;
    areaCount: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
  } {
    const allHighlights = [
      ...this.getAllComponentHighlights(),
      ...this.getAllConnectionHighlights(),
      ...this.getAllAreaHighlights()
    ];

    return {
      componentCount: this.componentHighlights.size,
      connectionCount: this.connectionHighlights.size,
      areaCount: this.areaHighlights.length,
      errorCount: allHighlights.filter(h => h.severity === 'error').length,
      warningCount: allHighlights.filter(h => h.severity === 'warning').length,
      infoCount: allHighlights.filter(h => h.severity === 'info').length
    };
  }
}