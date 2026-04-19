import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CutMarker } from '../../components/CutMarker';
import { createAppSettings, createCut } from '../../test/factories';

const RenderCutMarker = ({
  onUpdatePosition,
  onDragEnd,
  onSelect = vi.fn(),
  isSelected = false,
}: {
  onUpdatePosition: ReturnType<typeof vi.fn>;
  onDragEnd: ReturnType<typeof vi.fn>;
  onSelect?: ReturnType<typeof vi.fn>;
  isSelected?: boolean;
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} data-testid="container" className="relative h-[1000px] w-[1000px]">
      <CutMarker
        cut={createCut({ x: 0.1, y: 0.1, label: '001' })}
        settings={createAppSettings()}
        isSelected={isSelected}
        onSelect={onSelect}
        onDelete={vi.fn()}
        onUpdatePosition={onUpdatePosition}
        onDragEnd={onDragEnd}
        containerRef={containerRef}
      />
    </div>
  );
};

describe('CutMarker', () => {
  it('selects without starting a drag when clicked', () => {
    const onUpdatePosition = vi.fn();
    const onDragEnd = vi.fn();
    const onSelect = vi.fn();

    render(
      <RenderCutMarker
        onUpdatePosition={onUpdatePosition}
        onDragEnd={onDragEnd}
        onSelect={onSelect}
      />
    );

    const marker = screen.getByText('001');

    fireEvent.pointerDown(marker, {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 100,
      clientY: 100,
      button: 0,
    });
    fireEvent.pointerUp(marker, {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 102,
      clientY: 101,
      button: 0,
    });

    expect(onSelect).toHaveBeenCalledWith('cut-1');
    expect(onUpdatePosition).not.toHaveBeenCalled();
    expect(onDragEnd).not.toHaveBeenCalled();
  });

  it('stops dragging after releasing the pointer on the marker itself', () => {
    const onUpdatePosition = vi.fn();
    const onDragEnd = vi.fn();

    render(
      <RenderCutMarker
        onUpdatePosition={onUpdatePosition}
        onDragEnd={onDragEnd}
      />
    );

    const container = screen.getByTestId('container');
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 1000,
      bottom: 1000,
      width: 1000,
      height: 1000,
      toJSON: () => ({}),
    });

    const marker = screen.getByText('001');

    fireEvent.pointerDown(marker, {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 100,
      clientY: 100,
      button: 0,
    });
    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 150,
      clientY: 150,
    });
    fireEvent.pointerUp(marker, {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 150,
      clientY: 150,
      button: 0,
    });
    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 220,
      clientY: 220,
    });

    expect(onUpdatePosition).toHaveBeenCalledTimes(1);
    expect(onUpdatePosition).toHaveBeenCalledWith('cut-1', 0.15, 0.15);
    expect(onDragEnd).toHaveBeenCalledTimes(1);
  });

  it('updates the cut position through pointer drag input', () => {
    const onUpdatePosition = vi.fn();
    const onDragEnd = vi.fn();

    render(
      <RenderCutMarker
        onUpdatePosition={onUpdatePosition}
        onDragEnd={onDragEnd}
      />
    );

    const container = screen.getByTestId('container');
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 1000,
      bottom: 1000,
      width: 1000,
      height: 1000,
      toJSON: () => ({}),
    });

    fireEvent.pointerDown(screen.getByText('001'), {
      pointerId: 1,
      pointerType: 'pen',
      clientX: 100,
      clientY: 100,
      button: 0,
    });
    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'pen',
      clientX: 160,
      clientY: 180,
    });
    fireEvent.pointerUp(window, {
      pointerId: 1,
      pointerType: 'pen',
      clientX: 160,
      clientY: 180,
    });

    expect(onUpdatePosition).toHaveBeenCalledWith('cut-1', 0.16, 0.18);
    expect(onDragEnd).toHaveBeenCalled();
  });
});
