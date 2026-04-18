import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TemplateOverlay } from '../../components/TemplateOverlay';
import { createTemplate } from '../../test/factories';

const RenderTemplateOverlay = ({
  onChange,
}: {
  onChange: ReturnType<typeof vi.fn>;
}) => (
  <div className="pdf-page-container relative h-[1000px] w-[1000px]">
    <TemplateOverlay
      template={createTemplate({ xPosition: 0.1, rowCount: 3, rowPositions: [0.2, 0.5, 0.8] })}
      onChange={onChange}
      onInteractionStart={vi.fn()}
      onInteractionEnd={vi.fn()}
    />
  </div>
);

describe('TemplateOverlay', () => {
  it('updates the x guide through pointer drag input', () => {
    const onChange = vi.fn();

    const { container } = render(<RenderTemplateOverlay onChange={onChange} />);

    const pageContainer = container.querySelector('.pdf-page-container') as HTMLDivElement;
    vi.spyOn(pageContainer, 'getBoundingClientRect').mockReturnValue({
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

    fireEvent.pointerDown(screen.getByText('横位置 (配置の中心)'), {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 100,
      clientY: 100,
      button: 0,
    });
    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 300,
      clientY: 100,
    });
    fireEvent.pointerUp(window, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 300,
      clientY: 100,
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        xPosition: 0.3,
      })
    );
  });
});
