import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Header } from '../../components/Header';

const createProps = () => ({
  docType: null,
  onImportFileChange: vi.fn(),
  onExportPdf: vi.fn(),
  onExportImages: vi.fn(),
  includeProjectFileOnExport: false,
  onToggleIncludeProjectFileOnExport: vi.fn(),
  isExporting: false,
  mode: 'edit' as const,
  setMode: vi.fn(),
  canUndo: false,
  canRedo: false,
  onUndo: vi.fn(),
  onRedo: vi.fn(),
});

describe('Header', () => {
  it('switches to the mobile-tight labels when requested', () => {
    render(
      <Header
        {...createProps()}
        isMobileUi
        isMobileTight
      />
    );

    expect(screen.getByRole('button', { name: '番号' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '用紙' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
    expect(screen.queryByText('CutMark PDF')).not.toBeInTheDocument();
  });
});
