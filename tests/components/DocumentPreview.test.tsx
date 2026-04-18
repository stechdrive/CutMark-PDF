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

  it('highlights the snap column and target row while hovering near the snap area', () => {
    const template = createTemplate({
      xPosition: 0.1,
      rowCount: 3,
      rowPositions: [0.2, 0.5, 0.8],
    });

    const { container } = render(
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
        template={template}
        setTemplate={vi.fn()}
        settings={createAppSettings()}
        onContentClick={vi.fn()}
      />
    );

    const image = screen.getByAltText('Current page') as HTMLImageElement;
    Object.defineProperty(image, 'naturalWidth', { value: 1000, configurable: true });
    Object.defineProperty(image, 'naturalHeight', { value: 1000, configurable: true });
    fireEvent.load(image);
    const pageContainer = container.querySelector('.pdf-page-container') as HTMLElement;
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

    fireEvent.pointerMove(pageContainer, {
      pointerId: 99,
      pointerType: 'mouse',
      clientX: 95,
      clientY: 540,
    });

    expect(screen.getByText('自動スナップ')).toBeInTheDocument();
    expect(screen.queryByText('行 2')).not.toBeInTheDocument();
  });

  it('places a cut from touch pointer input using row snap placement', () => {
    const onContentClick = vi.fn();
    const template = createTemplate({
      xPosition: 0.1,
      rowCount: 3,
      rowPositions: [0.2, 0.5, 0.8],
    });

    const { container } = render(
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
        template={template}
        setTemplate={vi.fn()}
        settings={createAppSettings()}
        onContentClick={onContentClick}
      />
    );

    const pageContainer = container.querySelector('.pdf-page-container') as HTMLElement;
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

    fireEvent.pointerDown(pageContainer, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 95,
      clientY: 540,
    });
    fireEvent.pointerUp(pageContainer, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 95,
      clientY: 540,
    });

    expect(onContentClick).toHaveBeenCalledWith(0.1, 0.5);
  });

  it('does not place a cut when a pointer gesture turns into a drag', () => {
    const onContentClick = vi.fn();
    const { container } = render(
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
        onContentClick={onContentClick}
      />
    );

    const pageContainer = container.querySelector('.pdf-page-container') as HTMLElement;
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

    fireEvent.pointerDown(pageContainer, {
      pointerId: 2,
      pointerType: 'pen',
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(pageContainer, {
      pointerId: 2,
      pointerType: 'pen',
      clientX: 130,
      clientY: 130,
    });
    fireEvent.pointerUp(pageContainer, {
      pointerId: 2,
      pointerType: 'pen',
      clientX: 130,
      clientY: 130,
    });

    expect(onContentClick).not.toHaveBeenCalled();
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
      screen.getByText('プロジェクトJSONも、PDF や連番画像とまとめてドロップできます')
    ).toBeInTheDocument();
  });
});
