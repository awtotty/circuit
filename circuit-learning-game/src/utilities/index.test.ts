import { describe, it, expect } from 'vitest';
import { generateId, snapToGrid, calculateDistance } from './index';

describe('Utility functions', () => {
  describe('generateId', () => {
    it('should generate a string id', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should generate unique ids', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('snapToGrid', () => {
    it('should snap values to grid', () => {
      expect(snapToGrid(15, 20)).toBe(20);
      expect(snapToGrid(25, 20)).toBe(20);
      expect(snapToGrid(35, 20)).toBe(40);
    });

    it('should handle exact grid values', () => {
      expect(snapToGrid(40, 20)).toBe(40);
      expect(snapToGrid(0, 20)).toBe(0);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      const point1 = { x: 0, y: 0 };
      const point2 = { x: 3, y: 4 };
      expect(calculateDistance(point1, point2)).toBe(5);
    });

    it('should handle same points', () => {
      const point = { x: 10, y: 10 };
      expect(calculateDistance(point, point)).toBe(0);
    });
  });
});
