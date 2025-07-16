// Specific electrical component implementations

import type { Position } from './index';
import { BaseElectricalComponent, type IElectricalComponent, type Terminal, type ValidationResult } from './components';

export class Resistor extends BaseElectricalComponent {
  constructor(id: string, position: Position, resistance: number = 1000) {
    super(id, 'resistor', position, { resistance });
  }

  protected initializeTerminals(): Terminal[] {
    return [
      this.createTerminal('terminal1', { x: -20, y: 0 }, 'bidirectional'),
      this.createTerminal('terminal2', { x: 20, y: 0 }, 'bidirectional')
    ];
  }

  protected validateSpecific(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const resistance = this.getProperty<number>('resistance');
    if (resistance === undefined || resistance <= 0) {
      errors.push('Resistance must be a positive number');
    }

    if (resistance && resistance < 1) {
      warnings.push('Very low resistance may cause high current');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  public clone(): IElectricalComponent {
    const cloned = new Resistor(
      this.id + '_copy',
      { ...this.position },
      this.getProperty<number>('resistance')
    );
    return cloned;
  }

  public getResistance(): number {
    return this.getProperty<number>('resistance') || 1000;
  }

  public setResistance(resistance: number): void {
    if (resistance > 0) {
      this.setProperty('resistance', resistance);
    }
  }
}

export class Battery extends BaseElectricalComponent {
  constructor(id: string, position: Position, voltage: number = 9) {
    super(id, 'battery', position, { voltage });
  }

  protected initializeTerminals(): Terminal[] {
    return [
      this.createTerminal('positive', { x: 20, y: 0 }, 'output'),
      this.createTerminal('negative', { x: -20, y: 0 }, 'input')
    ];
  }

  protected validateSpecific(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const voltage = this.getProperty<number>('voltage');
    if (voltage === undefined || voltage <= 0) {
      errors.push('Voltage must be a positive number');
    }

    if (voltage && voltage > 12) {
      warnings.push('High voltage may be dangerous in educational context');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  public clone(): IElectricalComponent {
    const cloned = new Battery(
      this.id + '_copy',
      { ...this.position },
      this.getProperty<number>('voltage')
    );
    return cloned;
  }

  public getVoltage(): number {
    return this.getProperty<number>('voltage') || 9;
  }

  public setVoltage(voltage: number): void {
    if (voltage > 0) {
      this.setProperty('voltage', voltage);
    }
  }
}

export class LED extends BaseElectricalComponent {
  constructor(id: string, position: Position, forwardVoltage: number = 2.0) {
    super(id, 'led', position, { 
      forwardVoltage,
      isLit: false,
      brightness: 0
    });
  }

  protected initializeTerminals(): Terminal[] {
    return [
      this.createTerminal('anode', { x: 15, y: 0 }, 'input'),
      this.createTerminal('cathode', { x: -15, y: 0 }, 'output')
    ];
  }

  protected validateSpecific(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const forwardVoltage = this.getProperty<number>('forwardVoltage');
    if (forwardVoltage === undefined || forwardVoltage <= 0) {
      errors.push('Forward voltage must be a positive number');
    }

    if (forwardVoltage && forwardVoltage > 5) {
      warnings.push('High forward voltage is unusual for standard LEDs');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  public clone(): IElectricalComponent {
    const cloned = new LED(
      this.id + '_copy',
      { ...this.position },
      this.getProperty<number>('forwardVoltage')
    );
    return cloned;
  }

  public getForwardVoltage(): number {
    return this.getProperty<number>('forwardVoltage') || 2.0;
  }

  public setForwardVoltage(voltage: number): void {
    if (voltage > 0) {
      this.setProperty('forwardVoltage', voltage);
    }
  }

  public isLit(): boolean {
    return this.getProperty<boolean>('isLit') || false;
  }

  public setLit(lit: boolean): void {
    this.setProperty('isLit', lit);
  }

  public getBrightness(): number {
    return this.getProperty<number>('brightness') || 0;
  }

  public setBrightness(brightness: number): void {
    const clampedBrightness = Math.max(0, Math.min(1, brightness));
    this.setProperty('brightness', clampedBrightness);
    this.setProperty('isLit', clampedBrightness > 0);
  }
}

export class Wire extends BaseElectricalComponent {
  constructor(id: string, position: Position, points: Position[] = []) {
    super(id, 'wire', position, { 
      points: JSON.stringify(points),
      resistance: 0.01 // Very low resistance for wires
    });
  }

  protected initializeTerminals(): Terminal[] {
    const points = this.getPoints();
    if (points.length < 2) {
      return [];
    }

    return [
      this.createTerminal('start', points[0], 'bidirectional'),
      this.createTerminal('end', points[points.length - 1], 'bidirectional')
    ];
  }

  protected validateSpecific(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const points = this.getPoints();
    if (points.length < 2) {
      errors.push('Wire must have at least 2 points');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  public clone(): IElectricalComponent {
    const cloned = new Wire(
      this.id + '_copy',
      { ...this.position },
      this.getPoints()
    );
    return cloned;
  }

  public getPoints(): Position[] {
    const pointsStr = this.getProperty<string>('points');
    if (!pointsStr) return [];
    
    try {
      return JSON.parse(pointsStr);
    } catch {
      return [];
    }
  }

  public setPoints(points: Position[]): void {
    this.setProperty('points', JSON.stringify(points));
    // Update terminals when points change
    this.terminals = this.initializeTerminals();
  }

  public addPoint(point: Position): void {
    const points = this.getPoints();
    points.push(point);
    this.setPoints(points);
  }
}