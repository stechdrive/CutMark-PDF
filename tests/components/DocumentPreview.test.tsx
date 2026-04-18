import type React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DocumentPreview } from '../../components/DocumentPreview';
import { createAppSettings, createTemplate } from '../../test/factories';

vi.mock('react-pdf', () => ({
  Document: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Page: () => <div>PDF Page</div>,
}));

describe('DocumentPreview', () => {
  it('shows a project notice while editing an unassigned logical page', () => {
    render(
      <DocumentPreview
        docType="images"
        pdfFile={null}
        currentImageUrl="blob:image"
        numPages={2}
        setNumPages={vi.fn()}
        currentPage={1}
        setCurrentPage={vi.fn()}
        scale={1}
        setScale={vi.fn()}
        isDragging={false}
        dragHandlers={{
          onDragEnter: vi.fn(),
          onDragOver: vi.fn(),
          onDragLeave: vi.fn(),
        }}
        onFileDropped={vi.fn()}
        cuts={[]}
        selectedCutId={null}
        setSelectedCutId={vi.fn()}
        deleteCut={vi.fn()}
        updateCutPosition={vi.fn()}
        handleCutDragEnd={vi.fn()}
        mode="edit"
        template={createTemplate()}
        setTemplate={vi.fn()}
        settings={createAppSettings()}
        projectNotice={{
          title: '論理P2 は未割当です',
          message: '右パネルで現在の素材ページを割り当てると、プレビューが同期します。',
        }}
        onContentClick={vi.fn()}
      />
    );

    expect(screen.getByText('論理P2 は未割当です')).toBeInTheDocument();
    expect(
      screen.getByText('右パネルで現在の素材ページを割り当てると、プレビューが同期します。')
    ).toBeInTheDocument();
  });
});
