import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExportOverlay } from '../../components/ExportOverlay';

describe('ExportOverlay', () => {
  it('shows progress while exporting', () => {
    render(<ExportOverlay isExporting={true} />);

    expect(screen.getByText('書き出し処理中...')).toBeInTheDocument();
    expect(screen.getByText('大量の画像の場合、時間がかかることがあります')).toBeInTheDocument();
  });

  it('renders nothing when not exporting', () => {
    const { container } = render(<ExportOverlay isExporting={false} />);

    expect(container).toBeEmptyDOMElement();
  });
});
