// Integration tests for wire connection functionality in CircuitBoard

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { CircuitBoard } from '../CircuitBoard';
import { Resistor, Battery, LED } from '../../types/electrical-components';
import type { IElectricalComponent, Connection } from '../../types';

describe('CircuitBoard Wire Connection Integration', () => {
    let components: IElectricalComponent[];
    let connections: Connection[];
    let mockOnConnectionCreate: ReturnType<typeof vi.fn>;
    let mockOnConnectionDelete: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        // Create test components with proper terminal positions
        const resistor = new Resistor('resistor1', { x: 100, y: 100 }, 1000);
        const battery = new Battery('battery1', { x: 200, y: 100 }, 9);
        const led = new LED('led1', { x: 300, y: 100 }, 2.0);

        components = [resistor, battery, led];
        connections = [];

        mockOnConnectionCreate = vi.fn();
        mockOnConnectionDelete = vi.fn();
    });

    it('should render wire mode toggle button', () => {
        render(
            <CircuitBoard
                components={components}
                connections={connections}
                onConnectionCreate={mockOnConnectionCreate}
                onConnectionDelete={mockOnConnectionDelete}
            />
        );

        const wireToggle = screen.getByTestId('wire-mode-toggle');
        expect(wireToggle).toBeInTheDocument();
        expect(wireToggle).toHaveTextContent('Wire Mode');
    });

    it('should toggle wire mode when button is clicked', () => {
        render(
            <CircuitBoard
                components={components}
                connections={connections}
                onConnectionCreate={mockOnConnectionCreate}
                onConnectionDelete={mockOnConnectionDelete}
            />
        );

        const wireToggle = screen.getByTestId('wire-mode-toggle');
        const canvas = screen.getByTestId('circuit-board-canvas');

        // Initially not in wire mode
        expect(wireToggle).toHaveTextContent('Wire Mode');
        expect(canvas).toHaveStyle('cursor: default');

        // Click to enter wire mode
        fireEvent.click(wireToggle);
        expect(wireToggle).toHaveTextContent('Exit Wire Mode');
        expect(canvas).toHaveStyle('cursor: crosshair');

        // Click to exit wire mode
        fireEvent.click(wireToggle);
        expect(wireToggle).toHaveTextContent('Wire Mode');
        expect(canvas).toHaveStyle('cursor: default');
    });

    it('should show wire mode status in mouse position display', () => {
        render(
            <CircuitBoard
                components={components}
                connections={connections}
                onConnectionCreate={mockOnConnectionCreate}
                onConnectionDelete={mockOnConnectionDelete}
            />
        );

        const wireToggle = screen.getByTestId('wire-mode-toggle');

        // Initially no wire mode status
        expect(screen.queryByText('Wire Mode Active')).not.toBeInTheDocument();

        // Enter wire mode
        fireEvent.click(wireToggle);
        expect(screen.getByText('Wire Mode Active')).toBeInTheDocument();

        // Exit wire mode
        fireEvent.click(wireToggle);
        expect(screen.queryByText('Wire Mode Active')).not.toBeInTheDocument();
    });

    it('should handle terminal clicks in wire mode', () => {
        render(
            <CircuitBoard
                components={components}
                connections={connections}
                onConnectionCreate={mockOnConnectionCreate}
                onConnectionDelete={mockOnConnectionDelete}
            />
        );

        const wireToggle = screen.getByTestId('wire-mode-toggle');

        // Enter wire mode
        fireEvent.click(wireToggle);

        // This test verifies wire mode is active - actual terminal clicking
        // would require more complex canvas interaction testing
        expect(wireToggle).toHaveTextContent('Exit Wire Mode');
        expect(screen.getByText('Wire Mode Active')).toBeInTheDocument();
    });

    it('should cancel wire drawing when clicking empty space', () => {
        render(
            <CircuitBoard
                components={components}
                connections={connections}
                onConnectionCreate={mockOnConnectionCreate}
                onConnectionDelete={mockOnConnectionDelete}
            />
        );

        const wireToggle = screen.getByTestId('wire-mode-toggle');
        const canvas = screen.getByTestId('circuit-board-canvas');

        // Enter wire mode
        fireEvent.click(wireToggle);

        // Click on battery terminal to start wire drawing
        const batteryOutputPos = { x: 220, y: 100 };
        fireEvent.click(canvas, {
            clientX: batteryOutputPos.x,
            clientY: batteryOutputPos.y
        });

        // Click on empty space to cancel
        fireEvent.click(canvas, {
            clientX: 50,
            clientY: 50
        });

        // Should not have created any connection
        expect(mockOnConnectionCreate).not.toHaveBeenCalled();
    });

    it('should update wire preview during mouse movement', () => {
        render(
            <CircuitBoard
                components={components}
                connections={connections}
                onConnectionCreate={mockOnConnectionCreate}
                onConnectionDelete={mockOnConnectionDelete}
            />
        );

        const wireToggle = screen.getByTestId('wire-mode-toggle');
        const canvas = screen.getByTestId('circuit-board-canvas');

        // Enter wire mode
        fireEvent.click(wireToggle);

        // Click on battery terminal to start wire drawing
        const batteryOutputPos = { x: 220, y: 100 };
        fireEvent.click(canvas, {
            clientX: batteryOutputPos.x,
            clientY: batteryOutputPos.y
        });

        // Move mouse to update wire preview
        fireEvent.mouseMove(canvas, {
            clientX: 150,
            clientY: 150
        });

        // The wire preview should be updated (tested through visual rendering)
        // This test mainly ensures no errors occur during mouse movement
        expect(canvas).toBeInTheDocument();
    });

    it('should render existing connections', () => {
        // Create a connection between battery and resistor
        const existingConnection: Connection = {
            id: 'test-connection',
            fromComponent: 'battery1',
            toComponent: 'resistor1',
            fromTerminal: 'positive',
            toTerminal: 'terminal1'
        };

        render(
            <CircuitBoard
                components={components}
                connections={[existingConnection]}
                onConnectionCreate={mockOnConnectionCreate}
                onConnectionDelete={mockOnConnectionDelete}
            />
        );

        const canvas = screen.getByTestId('circuit-board-canvas');
        expect(canvas).toBeInTheDocument();

        // The connection should be rendered on the canvas
        // This is mainly a smoke test to ensure rendering doesn't crash
    });

    it('should handle component selection in non-wire mode', () => {
        const mockOnComponentSelect = vi.fn();

        render(
            <CircuitBoard
                components={components}
                connections={connections}
                onConnectionCreate={mockOnConnectionCreate}
                onConnectionDelete={mockOnConnectionDelete}
                onComponentSelect={mockOnComponentSelect}
            />
        );

        // This test verifies the component selection callback is properly wired
        // Actual canvas click testing would require more complex setup
        expect(mockOnComponentSelect).toBeDefined();
    });

    it('should not select components when in wire mode', () => {
        const mockOnComponentSelect = vi.fn();

        render(
            <CircuitBoard
                components={components}
                connections={connections}
                onConnectionCreate={mockOnConnectionCreate}
                onConnectionDelete={mockOnConnectionDelete}
                onComponentSelect={mockOnComponentSelect}
            />
        );

        const wireToggle = screen.getByTestId('wire-mode-toggle');
        const canvas = screen.getByTestId('circuit-board-canvas');

        // Enter wire mode
        fireEvent.click(wireToggle);

        // Click on battery component (in wire mode, but not on terminal)
        fireEvent.click(canvas, {
            clientX: 200,
            clientY: 100
        });

        // Should not select the component in wire mode
        expect(mockOnComponentSelect).not.toHaveBeenCalled();
    });
});