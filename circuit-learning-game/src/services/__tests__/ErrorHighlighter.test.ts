// Tests for ErrorHighlighter service

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorHighlighter, type HighlightStyle, type ComponentHighlight, type ConnectionHighlight } from '../ErrorHighlighter';
import { CircuitValidator, type CircuitError } from '../CircuitValidator';
import { Battery, Resistor, LED } from '../../types/electrical-components';
import type { Connection } from '../../types';

// Mock canvas context for testing
class MockCanvasRenderingContext2D {
  public fillStyle: string | CanvasGradient | CanvasPattern = '';
  public strokeStyle: string | CanvasGradient | CanvasPattern = '';
  public lineWidth: number = 1;
  public globalAlpha: number = 1;

  public save(): void {}
  public restore(): void {}
  public strokeRect(x: number, y: number, width: number, height: number): void {}
  public beginPath(): void {}
  public moveTo(x: number, y: number): void {}
  public lineTo(x: number, y: number): void {}
  public stroke(): void {}
  public setLineDash(segments: number[]): void {}
}

describe('ErrorHighlighter', () => {
  let highlighter: ErrorHighlighter;
  let mockCtx: MockCanvasRenderingContext2D;

  beforeEach(() => {
    highlighter = new ErrorHighlighter();
    mockCtx = new MockCanvasRenderingContext2D();
  });

  describe('Initialization', () => {
    it('should initialize with empty highlights', () => {
      expect(highlighter.getAllComponentHighlights()).toHaveLength(0);
      expect(highlighter.getAllConnectionHighlights()).toHaveLength(0);
      expect(highlighter.getAllAreaHighlights()).toHaveLength(0);
    });

    it('should provide correct highlight summary for empty state', () => {
      const summary = highlighter.getHighlightSummary();
      
      expect(summary.componentCount).toBe(0);
      expect(summary.connectionCount).toBe(0);
      expect(summary.areaCount).toBe(0);
      expect(summary.errorCount).toBe(0);
      expect(summary.warningCount).toBe(0);
      expect(summary.infoCount).toBe(0);
    });
  });

  describe('Error Processing', () => {
    it('should process circuit errors and create highlights', () => {
      const errors: CircuitError[] = [
        {
          id: 'error1',
          type: 'short_circuit',
          severity: 'error',
          message: 'Short circuit detected',
          educationalExplanation: 'This is a short circuit explanation',
          affectedComponents: ['battery1', 'wire1'],
          affectedConnections: ['conn1'],
          visualHighlight: {
            type: 'component',
            targets: ['battery1', 'wire1'],
            color: '#ff0000',
            style: 'pulsing'
          }
        }
      ];

      highlighter.processErrors(errors);

      const componentHighlights = highlighter.getAllComponentHighlights();
      expect(componentHighlights).toHaveLength(2);
      expect(componentHighlights[0].componentId).toBe('battery1');
      expect(componentHighlights[1].componentId).toBe('wire1');
      expect(componentHighlights[0].severity).toBe('error');
      expect(componentHighlights[0].style.color).toBe('#ff0000');
      expect(componentHighlights[0].educationalExplanation).toBe('This is a short circuit explanation');
    });

    it('should process connection highlights', () => {
      const errors: CircuitError[] = [
        {
          id: 'error1',
          type: 'invalid_connection',
          severity: 'error',
          message: 'Invalid connection',
          educationalExplanation: 'This connection is invalid',
          affectedComponents: [],
          affectedConnections: ['conn1', 'conn2'],
          visualHighlight: {
            type: 'connection',
            targets: ['conn1', 'conn2'],
            color: '#ff8800',
            style: 'dashed'
          }
        }
      ];

      highlighter.processErrors(errors);

      const connectionHighlights = highlighter.getAllConnectionHighlights();
      expect(connectionHighlights).toHaveLength(2);
      expect(connectionHighlights[0].connectionId).toBe('conn1');
      expect(connectionHighlights[1].connectionId).toBe('conn2');
      expect(connectionHighlights[0].style.strokeDashArray).toBe('5,5');
    });

    it('should process area highlights', () => {
      const errors: CircuitError[] = [
        {
          id: 'error1',
          type: 'no_power_source',
          severity: 'error',
          message: 'No power source',
          educationalExplanation: 'Circuit needs a power source',
          affectedComponents: [],
          affectedConnections: [],
          visualHighlight: {
            type: 'area',
            targets: [],
            color: '#ff0000',
            style: 'dashed'
          }
        }
      ];

      highlighter.processErrors(errors);

      const areaHighlights = highlighter.getAllAreaHighlights();
      expect(areaHighlights).toHaveLength(1);
      expect(areaHighlights[0].style.color).toBe('#ff0000');
      expect(areaHighlights[0].style.strokeDashArray).toBe('5,5');
    });

    it('should clear existing highlights when processing new errors', () => {
      // Add initial highlights
      highlighter.addComponentHighlight('comp1', { color: '#ff0000', strokeWidth: 2, opacity: 0.8 }, 'Test');
      expect(highlighter.getAllComponentHighlights()).toHaveLength(1);

      // Process new errors should clear existing highlights
      const errors: CircuitError[] = [
        {
          id: 'error1',
          type: 'short_circuit',
          severity: 'error',
          message: 'Short circuit',
          educationalExplanation: 'Short circuit explanation',
          affectedComponents: ['comp2'],
          affectedConnections: [],
          visualHighlight: {
            type: 'component',
            targets: ['comp2'],
            color: '#00ff00',
            style: 'solid'
          }
        }
      ];

      highlighter.processErrors(errors);

      const highlights = highlighter.getAllComponentHighlights();
      expect(highlights).toHaveLength(1);
      expect(highlights[0].componentId).toBe('comp2');
      expect(highlights[0].style.color).toBe('#00ff00');
    });
  });

  describe('Style Creation', () => {
    it('should create correct styles for different severities', () => {
      const errorHighlight: CircuitError = {
        id: 'error1',
        type: 'short_circuit',
        severity: 'error',
        message: 'Error message',
        educationalExplanation: 'Error explanation',
        affectedComponents: ['comp1'],
        affectedConnections: [],
        visualHighlight: {
          type: 'component',
          targets: ['comp1'],
          color: '#ff0000',
          style: 'solid'
        }
      };

      const warningHighlight: CircuitError = {
        id: 'warning1',
        type: 'component_overload',
        severity: 'warning',
        message: 'Warning message',
        educationalExplanation: 'Warning explanation',
        affectedComponents: ['comp2'],
        affectedConnections: [],
        visualHighlight: {
          type: 'component',
          targets: ['comp2'],
          color: '#ff8800',
          style: 'solid'
        }
      };

      const infoHighlight: CircuitError = {
        id: 'info1',
        type: 'floating_node',
        severity: 'info',
        message: 'Info message',
        educationalExplanation: 'Info explanation',
        affectedComponents: ['comp3'],
        affectedConnections: [],
        visualHighlight: {
          type: 'component',
          targets: ['comp3'],
          color: '#0088ff',
          style: 'solid'
        }
      };

      highlighter.processErrors([errorHighlight, warningHighlight, infoHighlight]);

      const errorStyle = highlighter.getComponentHighlight('comp1')?.style;
      const warningStyle = highlighter.getComponentHighlight('comp2')?.style;
      const infoStyle = highlighter.getComponentHighlight('comp3')?.style;

      expect(errorStyle?.strokeWidth).toBe(4); // Error should have thickest stroke
      expect(warningStyle?.strokeWidth).toBe(3); // Warning should have medium stroke
      expect(infoStyle?.strokeWidth).toBe(2); // Info should have thinnest stroke
    });

    it('should create correct animation styles', () => {
      const pulsingError: CircuitError = {
        id: 'error1',
        type: 'short_circuit',
        severity: 'error',
        message: 'Pulsing error',
        educationalExplanation: 'This should pulse',
        affectedComponents: ['comp1'],
        affectedConnections: [],
        visualHighlight: {
          type: 'component',
          targets: ['comp1'],
          color: '#ff0000',
          style: 'pulsing'
        }
      };

      highlighter.processErrors([pulsingError]);

      const style = highlighter.getComponentHighlight('comp1')?.style;
      expect(style?.animation).toBe('pulse');
      expect(style?.animationDuration).toBe(1000);
    });
  });

  describe('Highlight Management', () => {
    it('should add and retrieve component highlights', () => {
      const style: HighlightStyle = {
        color: '#ff0000',
        strokeWidth: 3,
        opacity: 0.8
      };

      highlighter.addComponentHighlight('comp1', style, 'Test message', 'error');

      const highlight = highlighter.getComponentHighlight('comp1');
      expect(highlight).toBeDefined();
      expect(highlight?.componentId).toBe('comp1');
      expect(highlight?.style.color).toBe('#ff0000');
      expect(highlight?.message).toBe('Test message');
      expect(highlight?.severity).toBe('error');
    });

    it('should add and retrieve connection highlights', () => {
      const style: HighlightStyle = {
        color: '#00ff00',
        strokeWidth: 2,
        opacity: 0.6,
        strokeDashArray: '3,3'
      };

      highlighter.addConnectionHighlight('conn1', style, 'Connection message', 'warning');

      const highlight = highlighter.getConnectionHighlight('conn1');
      expect(highlight).toBeDefined();
      expect(highlight?.connectionId).toBe('conn1');
      expect(highlight?.style.color).toBe('#00ff00');
      expect(highlight?.style.strokeDashArray).toBe('3,3');
      expect(highlight?.severity).toBe('warning');
    });

    it('should check for highlight existence', () => {
      highlighter.addComponentHighlight('comp1', { color: '#ff0000', strokeWidth: 2, opacity: 0.8 }, 'Test');
      highlighter.addConnectionHighlight('conn1', { color: '#00ff00', strokeWidth: 2, opacity: 0.8 }, 'Test');

      expect(highlighter.hasComponentHighlight('comp1')).toBe(true);
      expect(highlighter.hasComponentHighlight('comp2')).toBe(false);
      expect(highlighter.hasConnectionHighlight('conn1')).toBe(true);
      expect(highlighter.hasConnectionHighlight('conn2')).toBe(false);
    });

    it('should clear specific highlights', () => {
      highlighter.addComponentHighlight('comp1', { color: '#ff0000', strokeWidth: 2, opacity: 0.8 }, 'Test');
      highlighter.addComponentHighlight('comp2', { color: '#00ff00', strokeWidth: 2, opacity: 0.8 }, 'Test');
      highlighter.addConnectionHighlight('conn1', { color: '#0000ff', strokeWidth: 2, opacity: 0.8 }, 'Test');

      expect(highlighter.getAllComponentHighlights()).toHaveLength(2);
      expect(highlighter.getAllConnectionHighlights()).toHaveLength(1);

      highlighter.clearComponentHighlight('comp1');
      expect(highlighter.getAllComponentHighlights()).toHaveLength(1);
      expect(highlighter.hasComponentHighlight('comp1')).toBe(false);
      expect(highlighter.hasComponentHighlight('comp2')).toBe(true);

      highlighter.clearConnectionHighlight('conn1');
      expect(highlighter.getAllConnectionHighlights()).toHaveLength(0);
    });

    it('should clear all highlights', () => {
      highlighter.addComponentHighlight('comp1', { color: '#ff0000', strokeWidth: 2, opacity: 0.8 }, 'Test');
      highlighter.addConnectionHighlight('conn1', { color: '#00ff00', strokeWidth: 2, opacity: 0.8 }, 'Test');

      expect(highlighter.getAllComponentHighlights()).toHaveLength(1);
      expect(highlighter.getAllConnectionHighlights()).toHaveLength(1);

      highlighter.clearAllHighlights();

      expect(highlighter.getAllComponentHighlights()).toHaveLength(0);
      expect(highlighter.getAllConnectionHighlights()).toHaveLength(0);
      expect(highlighter.getAllAreaHighlights()).toHaveLength(0);
    });
  });

  describe('CSS Style Generation', () => {
    it('should generate CSS styles for component highlights', () => {
      const style: HighlightStyle = {
        color: '#ff0000',
        strokeWidth: 3,
        opacity: 0.7,
        strokeDashArray: '5,5'
      };

      highlighter.addComponentHighlight('comp1', style, 'Test message');

      const cssStyle = highlighter.getComponentCSSStyle('comp1');
      expect(cssStyle).toBeDefined();
      expect(cssStyle?.outline).toBe('3px solid #ff0000');
      expect(cssStyle?.outlineOffset).toBe('2px');
      expect(cssStyle?.opacity).toBe(0.7);
      expect(cssStyle?.outlineStyle).toBe('dashed');
    });

    it('should generate CSS styles with animations', () => {
      const style: HighlightStyle = {
        color: '#ff0000',
        strokeWidth: 2,
        opacity: 0.8,
        animation: 'pulse',
        animationDuration: 1500
      };

      highlighter.addComponentHighlight('comp1', style, 'Test message');

      const cssStyle = highlighter.getComponentCSSStyle('comp1');
      expect(cssStyle?.animation).toBe('pulse 1500ms infinite');
    });

    it('should return undefined for non-existent component', () => {
      const cssStyle = highlighter.getComponentCSSStyle('nonexistent');
      expect(cssStyle).toBeUndefined();
    });
  });

  describe('Canvas Drawing', () => {
    it('should draw component highlights on canvas', () => {
      const style: HighlightStyle = {
        color: '#ff0000',
        strokeWidth: 3,
        opacity: 0.8,
        strokeDashArray: '5,5'
      };

      highlighter.addComponentHighlight('comp1', style, 'Test message');

      const bounds = { x: 10, y: 20, width: 50, height: 30 };
      
      // Mock the canvas context methods
      const saveSpy = vi.spyOn(mockCtx, 'save');
      const restoreSpy = vi.spyOn(mockCtx, 'restore');
      const strokeRectSpy = vi.spyOn(mockCtx, 'strokeRect');
      const setLineDashSpy = vi.spyOn(mockCtx, 'setLineDash');

      highlighter.drawComponentHighlight(mockCtx as any, 'comp1', bounds);

      expect(saveSpy).toHaveBeenCalled();
      expect(restoreSpy).toHaveBeenCalled();
      expect(mockCtx.strokeStyle).toBe('#ff0000');
      expect(mockCtx.lineWidth).toBe(3);
      expect(mockCtx.globalAlpha).toBe(0.8);
      expect(setLineDashSpy).toHaveBeenCalledWith([5, 5]);
      expect(strokeRectSpy).toHaveBeenCalledWith(5, 15, 60, 40); // bounds with padding
    });

    it('should draw connection highlights on canvas', () => {
      const style: HighlightStyle = {
        color: '#00ff00',
        strokeWidth: 2,
        opacity: 0.6
      };

      highlighter.addConnectionHighlight('conn1', style, 'Test message');

      const path = [
        { x: 10, y: 20 },
        { x: 30, y: 40 },
        { x: 50, y: 60 }
      ];

      const saveSpy = vi.spyOn(mockCtx, 'save');
      const restoreSpy = vi.spyOn(mockCtx, 'restore');
      const beginPathSpy = vi.spyOn(mockCtx, 'beginPath');
      const moveToSpy = vi.spyOn(mockCtx, 'moveTo');
      const lineToSpy = vi.spyOn(mockCtx, 'lineTo');
      const strokeSpy = vi.spyOn(mockCtx, 'stroke');

      highlighter.drawConnectionHighlight(mockCtx as any, 'conn1', path);

      expect(saveSpy).toHaveBeenCalled();
      expect(restoreSpy).toHaveBeenCalled();
      expect(mockCtx.strokeStyle).toBe('#00ff00');
      expect(mockCtx.lineWidth).toBe(2);
      expect(mockCtx.globalAlpha).toBe(0.6);
      expect(beginPathSpy).toHaveBeenCalled();
      expect(moveToSpy).toHaveBeenCalledWith(10, 20);
      expect(lineToSpy).toHaveBeenCalledWith(30, 40);
      expect(lineToSpy).toHaveBeenCalledWith(50, 60);
      expect(strokeSpy).toHaveBeenCalled();
    });

    it('should not draw highlights for non-existent components or connections', () => {
      const strokeRectSpy = vi.spyOn(mockCtx, 'strokeRect');
      const strokeSpy = vi.spyOn(mockCtx, 'stroke');

      highlighter.drawComponentHighlight(mockCtx as any, 'nonexistent', { x: 0, y: 0, width: 10, height: 10 });
      highlighter.drawConnectionHighlight(mockCtx as any, 'nonexistent', [{ x: 0, y: 0 }, { x: 10, y: 10 }]);

      expect(strokeRectSpy).not.toHaveBeenCalled();
      expect(strokeSpy).not.toHaveBeenCalled();
    });

    it('should handle empty connection paths', () => {
      highlighter.addConnectionHighlight('conn1', { color: '#ff0000', strokeWidth: 2, opacity: 0.8 }, 'Test');

      const strokeSpy = vi.spyOn(mockCtx, 'stroke');

      // Empty path
      highlighter.drawConnectionHighlight(mockCtx as any, 'conn1', []);
      expect(strokeSpy).not.toHaveBeenCalled();

      // Single point path
      highlighter.drawConnectionHighlight(mockCtx as any, 'conn1', [{ x: 10, y: 20 }]);
      expect(strokeSpy).not.toHaveBeenCalled();
    });
  });

  describe('Event Handling', () => {
    it('should notify subscribers of highlight changes', () => {
      let notificationCount = 0;
      const callback = () => notificationCount++;

      const unsubscribe = highlighter.onHighlightChange(callback);

      highlighter.addComponentHighlight('comp1', { color: '#ff0000', strokeWidth: 2, opacity: 0.8 }, 'Test');
      expect(notificationCount).toBe(1);

      highlighter.addConnectionHighlight('conn1', { color: '#00ff00', strokeWidth: 2, opacity: 0.8 }, 'Test');
      expect(notificationCount).toBe(2);

      highlighter.clearComponentHighlight('comp1');
      expect(notificationCount).toBe(3);

      // Unsubscribe and verify no more notifications
      unsubscribe();
      highlighter.addComponentHighlight('comp2', { color: '#0000ff', strokeWidth: 2, opacity: 0.8 }, 'Test');
      expect(notificationCount).toBe(3); // Should not increment
    });

    it('should handle multiple subscribers', () => {
      let count1 = 0;
      let count2 = 0;

      const callback1 = () => count1++;
      const callback2 = () => count2++;

      highlighter.onHighlightChange(callback1);
      highlighter.onHighlightChange(callback2);

      highlighter.addComponentHighlight('comp1', { color: '#ff0000', strokeWidth: 2, opacity: 0.8 }, 'Test');

      expect(count1).toBe(1);
      expect(count2).toBe(1);
    });
  });

  describe('Integration with CircuitValidator', () => {
    it('should work with real circuit validation errors', () => {
      const validator = new CircuitValidator();
      const battery = new Battery('battery1', { x: 0, y: 0 }, 9);
      const resistor = new Resistor('resistor1', { x: 50, y: 0 }, 220);

      // Create a circuit with disconnected components
      const components = [battery, resistor];
      const connections: Connection[] = [];

      const validationResult = validator.validateCircuit(components, connections);
      
      // Process the validation errors
      highlighter.processErrors([...validationResult.errors, ...validationResult.warnings]);

      const summary = highlighter.getHighlightSummary();
      expect(summary.componentCount + summary.connectionCount + summary.areaCount).toBeGreaterThan(0);
    });
  });

  describe('Educational Content', () => {
    it('should provide educational content for component highlights', () => {
      const errors: CircuitError[] = [
        {
          id: 'error1',
          type: 'short_circuit',
          severity: 'error',
          message: 'Short circuit detected',
          educationalExplanation: 'This is a detailed explanation about short circuits',
          suggestedFix: 'Add a resistor to limit current',
          affectedComponents: ['comp1'],
          affectedConnections: [],
          visualHighlight: {
            type: 'component',
            targets: ['comp1'],
            color: '#ff0000',
            style: 'pulsing'
          }
        }
      ];

      highlighter.processErrors(errors);
      
      const content = highlighter.getComponentEducationalContent('comp1');
      expect(content).toBeDefined();
      expect(content?.message).toBe('Short circuit detected');
      expect(content?.explanation).toBe('This is a detailed explanation about short circuits');
      expect(content?.suggestedFix).toBe('Add a resistor to limit current');
      expect(content?.severity).toBe('error');
    });

    it('should provide educational content for connection highlights', () => {
      const errors: CircuitError[] = [
        {
          id: 'error1',
          type: 'invalid_connection',
          severity: 'warning',
          message: 'Invalid connection',
          educationalExplanation: 'This connection is problematic because...',
          suggestedFix: 'Try connecting to a different terminal',
          affectedComponents: [],
          affectedConnections: ['conn1'],
          visualHighlight: {
            type: 'connection',
            targets: ['conn1'],
            color: '#ff8800',
            style: 'dashed'
          }
        }
      ];

      highlighter.processErrors(errors);
      
      const content = highlighter.getConnectionEducationalContent('conn1');
      expect(content).toBeDefined();
      expect(content?.message).toBe('Invalid connection');
      expect(content?.explanation).toBe('This connection is problematic because...');
      expect(content?.suggestedFix).toBe('Try connecting to a different terminal');
      expect(content?.severity).toBe('warning');
    });

    it('should get all educational content for current highlights', () => {
      // Add multiple highlights with educational content
      const errors: CircuitError[] = [
        {
          id: 'error1',
          type: 'short_circuit',
          severity: 'error',
          message: 'Short circuit detected',
          educationalExplanation: 'Short circuit explanation',
          suggestedFix: 'Add resistor',
          affectedComponents: ['comp1'],
          affectedConnections: [],
          visualHighlight: {
            type: 'component',
            targets: ['comp1'],
            color: '#ff0000',
            style: 'solid'
          }
        },
        {
          id: 'error2',
          type: 'invalid_connection',
          severity: 'warning',
          message: 'Invalid connection',
          educationalExplanation: 'Connection explanation',
          suggestedFix: 'Fix connection',
          affectedComponents: [],
          affectedConnections: ['conn1'],
          visualHighlight: {
            type: 'connection',
            targets: ['conn1'],
            color: '#ff8800',
            style: 'dashed'
          }
        }
      ];

      highlighter.processErrors(errors);
      
      const allContent = highlighter.getAllEducationalContent();
      expect(allContent).toHaveLength(2);
      
      const componentContent = allContent.find(c => c.id === 'comp1');
      expect(componentContent).toBeDefined();
      expect(componentContent?.type).toBe('component');
      expect(componentContent?.explanation).toBe('Short circuit explanation');
      
      const connectionContent = allContent.find(c => c.id === 'conn1');
      expect(connectionContent).toBeDefined();
      expect(connectionContent?.type).toBe('connection');
      expect(connectionContent?.explanation).toBe('Connection explanation');
    });

    it('should handle missing educational content gracefully', () => {
      // Add highlight without educational content
      highlighter.addComponentHighlight(
        'comp1',
        { color: '#ff0000', strokeWidth: 2, opacity: 0.8 },
        'Simple message',
        'info'
      );
      
      const content = highlighter.getComponentEducationalContent('comp1');
      expect(content).toBeDefined();
      expect(content?.message).toBe('Simple message');
      expect(content?.explanation).toBe('No detailed explanation available.');
      expect(content?.suggestedFix).toBeUndefined();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large numbers of highlights efficiently', () => {
      const startTime = performance.now();

      // Add many highlights
      for (let i = 0; i < 1000; i++) {
        highlighter.addComponentHighlight(
          `comp${i}`,
          { color: '#ff0000', strokeWidth: 2, opacity: 0.8 },
          `Message ${i}`
        );
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should complete within 100ms
      expect(highlighter.getAllComponentHighlights()).toHaveLength(1000);
    });

    it('should provide accurate highlight summary', () => {
      // Add highlights of different severities
      highlighter.addComponentHighlight('comp1', { color: '#ff0000', strokeWidth: 4, opacity: 0.8 }, 'Error', 'error');
      highlighter.addComponentHighlight('comp2', { color: '#ff8800', strokeWidth: 3, opacity: 0.8 }, 'Warning', 'warning');
      highlighter.addConnectionHighlight('conn1', { color: '#0088ff', strokeWidth: 2, opacity: 0.8 }, 'Info', 'info');

      const summary = highlighter.getHighlightSummary();

      expect(summary.componentCount).toBe(2);
      expect(summary.connectionCount).toBe(1);
      expect(summary.areaCount).toBe(0);
      expect(summary.errorCount).toBe(1);
      expect(summary.warningCount).toBe(1);
      expect(summary.infoCount).toBe(1);
    });
  });
});