import type React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DocumentPreview } from '../../components/DocumentPreview';
import { createAppSettings, createTemplate } from '../../test/factories';

vi.mock('react-pdf', () => ({
  Document: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Page: () => <div>PDF Page</div>,
}));

describe('DocumentPreview', () => {
  it('uses wheel input to change pages inside the preview viewport', () => {
    const setCurrentPage = vi.fn();
    const { container } = render(
      <DocumentPreview
        docType="images"
        pdfFile={null}
        currentImageUrl="blob:image"
        numPages={3}
        setNumPages={vi.fn()}
        currentPage={1}
        setCurrentPage={setCurrentPage}
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
        onContentClick={vi.fn()}
      />
    );

    fireEvent.wheel(container.firstChild as HTMLElement, { deltaY: 120 });

    expect(setCurrentPage).toHaveBeenCalledWith(2);
  });

  it('uses middle-button drag to pan the preview viewport', () => {
    const { container } = render(
      <DocumentPreview
        docType="images"
        pdfFile={null}
        currentImageUrl="blob:image"
        numPages={3}
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
        onContentClick={vi.fn()}
      />
    );

    const viewport = container.firstChild as HTMLElement;
    viewport.scrollLeft = 120;
    viewport.scrollTop = 90;

    fireEvent.mouseDown(viewport, { button: 1, clientX: 100, clientY: 100 });
    fireEvent.mouseMove(window, { clientX: 130, clientY: 150 });

    expect(viewport.scrollLeft).toBe(90);
    expect(viewport.scrollTop).toBe(40);

    fireEvent.mouseUp(window);
  });

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
          title: 'カット番号P2 は未配置です',
          message: '左パネルでコンテへ割り付けると、プレビューが同期します。背景のコンテ表示は参照用です。',
        }}
        onContentClick={vi.fn()}
      />
    );

    expect(screen.getByText('カット番号P2 は未配置です')).toBeInTheDocument();
    expect(
      screen.getByText('左パネルでコンテへ割り付けると、プレビューが同期します。背景のコンテ表示は参照用です。')
    ).toBeInTheDocument();
  });

  it('shows the updated import guidance in the empty welcome state', () => {
    render(
      <DocumentPreview
        docType={null}
        pdfFile={null}
        currentImageUrl={null}
        numPages={0}
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
        onContentClick={vi.fn()}
      />
    );

    expect(
      screen.getByText((content) =>
        content.includes('または「読み込み」から PDF / 連番画像 / プロジェクトJSON を選んでください')
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('プロジェクトJSONは、PDF 1つ または 連番画像と一緒に読み込めます')
    ).toBeInTheDocument();
  });
});
