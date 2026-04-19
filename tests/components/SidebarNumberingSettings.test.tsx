import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createAppSettings } from '../../test/factories';
import { SidebarNumberingSettings } from '../../components/SidebarNumberingSettings';

describe('SidebarNumberingSettings', () => {
  it('starts branch numbering from A when toggled on', async () => {
    const user = userEvent.setup();
    const setNumberingState = vi.fn();

    render(
      <SidebarNumberingSettings
        settings={createAppSettings({ branchChar: null, nextNumber: 5 })}
        setSettings={vi.fn()}
        setNumberingState={setNumberingState}
        selectedCutId={null}
        onRenumberFromSelected={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'OFF' }));

    expect(setNumberingState).toHaveBeenCalledWith({
      nextNumber: 5,
      branchChar: 'A',
    });
  });

  it('increments the parent number when branch numbering is toggled off', async () => {
    const user = userEvent.setup();
    const setNumberingState = vi.fn();

    render(
      <SidebarNumberingSettings
        settings={createAppSettings({ branchChar: 'B', nextNumber: 5 })}
        setSettings={vi.fn()}
        setNumberingState={setNumberingState}
        selectedCutId={null}
        onRenumberFromSelected={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'ON (B)' }));

    expect(setNumberingState).toHaveBeenCalledWith({
      nextNumber: 6,
      branchChar: null,
    });
  });

  it('passes the selected cut to the renumber action and disables the button otherwise', async () => {
    const user = userEvent.setup();
    const onRenumberFromSelected = vi.fn();
    const { rerender } = render(
      <SidebarNumberingSettings
        settings={createAppSettings()}
        setSettings={vi.fn()}
        setNumberingState={vi.fn()}
        selectedCutId={null}
        onRenumberFromSelected={onRenumberFromSelected}
      />
    );

    expect(
      screen.getByText(
        '選択中のカット番号から、「配置する番号」を開始番号にして振り直します。'
      )
    ).toBeInTheDocument();

    const disabledButton = screen.getByRole('button', { name: 'カット番号を振り直し' });
    expect(disabledButton).toBeDisabled();

    rerender(
      <SidebarNumberingSettings
        settings={createAppSettings()}
        setSettings={vi.fn()}
        setNumberingState={vi.fn()}
        selectedCutId="cut-42"
        onRenumberFromSelected={onRenumberFromSelected}
      />
    );

    await user.click(screen.getByRole('button', { name: 'カット番号を振り直し' }));

    expect(onRenumberFromSelected).toHaveBeenCalledWith('cut-42');
  });

  it('updates the next number through the setter callback', () => {
    const setNumberingState = vi.fn();

    render(
      <SidebarNumberingSettings
        settings={createAppSettings({ nextNumber: 3 })}
        setSettings={vi.fn()}
        setNumberingState={setNumberingState}
        selectedCutId={null}
        onRenumberFromSelected={vi.fn()}
      />
    );

    fireEvent.change(screen.getByDisplayValue('3'), {
      target: { value: '12' },
    });

    expect(setNumberingState).toHaveBeenCalledWith({
      nextNumber: 12,
      branchChar: null,
    });
  });

  it('toggles cut-number snap placement through the settings setter', async () => {
    const user = userEvent.setup();
    const setSettings = vi.fn();

    render(
      <SidebarNumberingSettings
        settings={createAppSettings({ enableClickSnapToRows: false })}
        setSettings={setSettings}
        setNumberingState={vi.fn()}
        selectedCutId={null}
        onRenumberFromSelected={vi.fn()}
      />
    );

    await user.click(screen.getByText('カット番号をスナップ配置'));

    expect(setSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        enableClickSnapToRows: true,
      })
    );
    expect(screen.getByText('カット番号をスナップ配置')).toHaveAttribute(
      'title',
      'コンテ用紙設定で指定したカット番号列の近くをクリックすると、その行に合わせて自動配置します。'
    );
  });
});
