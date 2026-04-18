import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CutMarker } from '../../components/CutMarker';
import { createAppSettings, createCut } from '../../test/factories';

const RenderCutMarker = ({
  onUpdatePosition,
  onDragEnd,
}: {
  onUpdatePosition: ReturnType<typeof vi.fn>;
  onDragEnd: ReturnType<typeof vi.fn>;
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} data-testid="container" className="relative h-[1000px] w-[1000px]">
      <CutMarker
        cut={createCut({ x: 0.1, y: 0.1, label: '001' })}
        settings={createAppSettings()}
        isSelected={false}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onUpdatePosition={onUpdatePosition}
        onDragEnd={onDragEnd}
        containerRef={containerRef}
      />
    </div>
  );
};

describe('CutMarker', () => {
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
