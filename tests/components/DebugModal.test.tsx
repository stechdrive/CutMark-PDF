import React, { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DebugModal } from '../../components/DebugModal';

describe('DebugModal', () => {
  it('renders the debug report and forwards copy/close actions', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onCopy = vi.fn();

    render(
      <DebugModal
        open={true}
        debugTextRef={createRef<HTMLTextAreaElement>()}
        debugReport={'debug report body'}
        debugCopyStatus="copied"
        onClose={onClose}
        onCopy={onCopy}
      />
    );

    expect(screen.getByText('デバッグログ')).toBeInTheDocument();
    expect(screen.getByDisplayValue('debug report body')).toBeInTheDocument();
    expect(screen.getByText('コピーしました')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'コピー' }));
    await user.click(screen.getByRole('button', { name: '閉じる' }));

    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing while closed', () => {
    const { container } = render(
      <DebugModal
        open={false}
        debugTextRef={createRef<HTMLTextAreaElement>()}
        debugReport=""
        debugCopyStatus="idle"
        onClose={vi.fn()}
        onCopy={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
