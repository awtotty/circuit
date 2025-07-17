// Error message system with educational explanations

import type { CircuitError } from './CircuitValidator';
import type { ErrorHighlighter } from './ErrorHighlighter';

export interface ErrorMessage {
  id: string;
  title: string;
  message: string;
  explanation: string;
  suggestedFix?: string;
  severity: 'error' | 'warning' | 'info';
  relatedConcepts: string[];
  learnMoreLinks?: string[];
}

export interface ErrorMessageOptions {
  showSuggestedFixes: boolean;
  showRelatedConcepts: boolean;
  showLearnMoreLinks: boolean;
  groupBySeverity: boolean;
  maxMessagesShown: number;
}

/**
 * Service for managing and displaying educational error messages
 * Provides detailed explanations and learning resources for circuit errors
 */
export class ErrorMessageSystem {
  private errorMessages: ErrorMessage[] = [];
  private options: ErrorMessageOptions;
  private highlighter: ErrorHighlighter;
  private onMessageChangeCallbacks = new Set<() => void>();

  constructor(highlighter: ErrorHighlighter, options: Partial<ErrorMessageOptions> = {}) {
    this.highlighter = highlighter;
    this.options = {
      showSuggestedFixes: true,
      showRelatedConcepts: true,
      showLearnMoreLinks: true,
      groupBySeverity: true,
      maxMessagesShown: 5,
      ...options
    };

    // Subscribe to highlight changes
    this.subscribeToHighlighter();
  }
  
  /**
   * Subscribe to highlighter changes
   */
  private subscribeToHighlighter(): void {
    this.highlighter.onHighlightChange(() => {
      this.updateMessagesFromHighlights();
    });
  }

  /**
   * Update error messages based on current highlights
   */
  private updateMessagesFromHighlights(): void {
    this.clearMessages();
    
    // Get all educational content from highlighter
    const allContent = this.highlighter.getAllEducationalContent();
    
    // Convert to error messages
    for (const content of allContent) {
      const relatedConcepts = this.getRelatedConceptsForErrorType(content.type);
      const learnMoreLinks = this.getLearnMoreLinksForErrorType(content.type);
      
      this.errorMessages.push({
        id: content.id,
        title: this.getTitleForErrorType(content.type),
        message: content.message,
        explanation: content.explanation,
        suggestedFix: content.suggestedFix,
        severity: content.severity,
        relatedConcepts,
        learnMoreLinks
      });
    }
    
    this.notifyMessageChange();
  }

  /**
   * Get a title for the error type
   */
  private getTitleForErrorType(type: 'component' | 'connection' | 'area'): string {
    switch (type) {
      case 'component':
        return 'Component Issue';
      case 'connection':
        return 'Connection Issue';
      case 'area':
        return 'Circuit Issue';
      default:
        return 'Circuit Issue';
    }
  }

  /**
   * Get related electrical concepts for an error type
   */
  private getRelatedConceptsForErrorType(type: 'component' | 'connection' | 'area'): string[] {
    switch (type) {
      case 'component':
        return ['Component Properties', 'Electrical Ratings', 'Power Dissipation'];
      case 'connection':
        return ['Circuit Connectivity', 'Electrical Paths', 'Terminal Polarity'];
      case 'area':
        return ['Circuit Design', 'Electrical Theory', 'Circuit Analysis'];
      default:
        return [];
    }
  }

  /**
   * Get learning resources for an error type
   */
  private getLearnMoreLinksForErrorType(type: 'component' | 'connection' | 'area'): string[] {
    switch (type) {
      case 'component':
        return [
          'https://learn.sparkfun.com/tutorials/basic-electronics',
          'https://www.electronics-tutorials.ws/resistor/res_1.html'
        ];
      case 'connection':
        return [
          'https://learn.sparkfun.com/tutorials/how-to-read-a-schematic',
          'https://www.electronics-tutorials.ws/circuittheory/circuit-theory.html'
        ];
      case 'area':
        return [
          'https://www.allaboutcircuits.com/textbook/',
          'https://www.electronics-tutorials.ws/dccircuits/dcp_1.html'
        ];
      default:
        return [];
    }
  }

  /**
   * Process circuit errors and create educational messages
   */
  public processErrors(errors: CircuitError[]): void {
    this.clearMessages();
    
    for (const error of errors) {
      const relatedConcepts = this.getRelatedConceptsForError(error);
      const learnMoreLinks = this.getLearnMoreLinksForError(error);
      
      this.errorMessages.push({
        id: error.id,
        title: this.getTitleForErrorType(error.visualHighlight?.type || 'area'),
        message: error.message,
        explanation: error.educationalExplanation,
        suggestedFix: error.suggestedFix,
        severity: error.severity,
        relatedConcepts,
        learnMoreLinks
      });
    }
    
    this.notifyMessageChange();
  }

  /**
   * Get related concepts based on error type
   */
  private getRelatedConceptsForError(error: CircuitError): string[] {
    switch (error.type) {
      case 'short_circuit':
        return ['Short Circuits', 'Current Flow', 'Ohm\'s Law', 'Circuit Protection'];
      case 'open_circuit':
        return ['Open Circuits', 'Circuit Continuity', 'Complete Paths'];
      case 'no_power_source':
        return ['Power Sources', 'Voltage', 'Energy in Circuits'];
      case 'disconnected_component':
        return ['Circuit Connectivity', 'Component Placement'];
      case 'invalid_connection':
        return ['Terminal Connections', 'Component Interfaces'];
      case 'component_overload':
        return ['Power Ratings', 'Component Specifications', 'Heat Dissipation'];
      case 'reverse_polarity':
        return ['Polarity', 'Diodes', 'Polarized Components'];
      case 'missing_current_limiting':
        return ['Current Limiting', 'Resistors', 'LED Protection'];
      case 'floating_node':
        return ['Circuit Nodes', 'Electrical Connections'];
      case 'duplicate_connection':
        return ['Circuit Design', 'Connection Management'];
      default:
        return ['Circuit Theory', 'Electrical Engineering'];
    }
  }

  /**
   * Get learning resources based on error type
   */
  private getLearnMoreLinksForError(error: CircuitError): string[] {
    switch (error.type) {
      case 'short_circuit':
        return [
          'https://www.electronics-tutorials.ws/dccircuits/short-circuit.html',
          'https://learn.sparkfun.com/tutorials/what-is-a-circuit/short-and-open-circuits'
        ];
      case 'open_circuit':
        return [
          'https://www.electronics-tutorials.ws/dccircuits/open-circuit.html',
          'https://learn.sparkfun.com/tutorials/what-is-a-circuit/short-and-open-circuits'
        ];
      case 'reverse_polarity':
        return [
          'https://www.electronics-tutorials.ws/diode/diode_1.html',
          'https://learn.sparkfun.com/tutorials/polarity/diode-and-led-polarity'
        ];
      case 'missing_current_limiting':
        return [
          'https://www.electronics-tutorials.ws/diode/diode_8.html',
          'https://learn.sparkfun.com/tutorials/light-emitting-diodes-leds/all'
        ];
      default:
        return [
          'https://www.allaboutcircuits.com/textbook/',
          'https://learn.sparkfun.com/tutorials'
        ];
    }
  }

  /**
   * Get all error messages
   */
  public getAllMessages(): ErrorMessage[] {
    if (this.options.groupBySeverity) {
      // Sort by severity: errors first, then warnings, then info
      return [...this.errorMessages].sort((a, b) => {
        const severityOrder = { error: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
    }
    return [...this.errorMessages];
  }

  /**
   * Get error messages by severity
   */
  public getMessagesBySeverity(severity: 'error' | 'warning' | 'info'): ErrorMessage[] {
    return this.errorMessages.filter(msg => msg.severity === severity);
  }

  /**
   * Get a specific error message by ID
   */
  public getMessageById(id: string): ErrorMessage | undefined {
    return this.errorMessages.find(msg => msg.id === id);
  }

  /**
   * Clear all error messages
   */
  public clearMessages(): void {
    this.errorMessages = [];
    this.notifyMessageChange();
  }

  /**
   * Update system options
   */
  public updateOptions(options: Partial<ErrorMessageOptions>): void {
    this.options = { ...this.options, ...options };
    this.notifyMessageChange();
  }

  /**
   * Get current options
   */
  public getOptions(): ErrorMessageOptions {
    return { ...this.options };
  }

  /**
   * Subscribe to message changes
   */
  public onMessageChange(callback: () => void): () => void {
    this.onMessageChangeCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.onMessageChangeCallbacks.delete(callback);
    };
  }

  /**
   * Notify all subscribers of message changes
   */
  private notifyMessageChange(): void {
    for (const callback of this.onMessageChangeCallbacks) {
      callback();
    }
  }

  /**
   * Get summary of current messages
   */
  public getMessageSummary(): {
    totalCount: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
  } {
    return {
      totalCount: this.errorMessages.length,
      errorCount: this.errorMessages.filter(msg => msg.severity === 'error').length,
      warningCount: this.errorMessages.filter(msg => msg.severity === 'warning').length,
      infoCount: this.errorMessages.filter(msg => msg.severity === 'info').length
    };
  }
}