import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar } from '../../components/Sidebar';
import { createAppSettings, createTemplate } from '../../test/factories';

const createSidebarProps = (mode: 'edit' | 'template' = 'edit') => {
  const template = createTemplate({
    id: 'template-1',
    name: '標準テンプレート',
    rowCount: 4,
    rowPositions: [0.2, 0.4, 0.6, 0.8],
  });

  return {
    mode,
    setMode: vi.fn(),
    pdfFile: null,
    selectedCutId: 'cut-1',
    templates: [
      template,
      createTemplate({ id: 'template-2', name: '修正版テンプレート' }),
    ],
    template,
    setTemplate: vi.fn(),
    changeTemplate: vi.fn(),
    saveTemplateByName: vi.fn(),
    deleteTemplate: vi.fn(),
    distributeRows: vi.fn(),
    onRowSnap: vi.fn(),
    settings: createAppSettings(),
    setSettings: vi.fn(),
    setLiveSettings: vi.fn(),
    onLiveSettingsStart: vi.fn(),
    onLiveSettingsEnd: vi.fn(),
    setNumberingState: vi.fn(),
    onRenumberFromSelected: vi.fn(),
  };
};

describe('Sidebar', () => {
  it('shows template selection, numbering, and style controls in edit mode', async () => {
    const user = userEvent.setup();
    const props = createSidebarProps('edit');

    render(<Sidebar {...props} />);

    expect(screen.getByText('用紙テンプレート')).toBeInTheDocument();
    expect(screen.getByText('番号設定')).toBeInTheDocument();
    expect(screen.getByText('表示スタイル')).toBeInTheDocument();
    expect(screen.queryByText('コンテ用紙設定')).not.toBeInTheDocument();
    expect(screen.queryByText('縦位置を均等配置')).not.toBeInTheDocument();
    expect(screen.queryByText('行スナップ入力')).not.toBeInTheDocument();

    await user.selectOptions(
      screen.getByRole('combobox'),
      'template-2'
    );

    expect(props.changeTemplate).toHaveBeenCalledWith('template-2');
  });

  it('replaces the right panel with paper settings in template mode', async () => {
    const user = userEvent.setup();
    const props = createSidebarProps('template');

    render(<Sidebar {...props} />);

    expect(screen.getByText('コンテ用紙設定')).toBeInTheDocument();
    expect(screen.getByText('縦位置を均等配置')).toBeInTheDocument();
    expect(
      screen.getByText(/行位置はプレビュー内の行入力欄をクリックして入力できます/)
    ).toBeInTheDocument();
    expect(screen.queryByText('番号設定')).not.toBeInTheDocument();
    expect(screen.queryByText('表示スタイル')).not.toBeInTheDocument();
    expect(screen.queryByText('用紙テンプレート')).not.toBeInTheDocument();
    expect(screen.queryByText('行スナップ入力')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '戻る' }));

    expect(props.setMode).toHaveBeenCalledWith('edit');
  });
});
