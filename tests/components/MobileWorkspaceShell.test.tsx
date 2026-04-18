import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MobileWorkspaceShell } from '../../components/MobileWorkspaceShell';

describe('MobileWorkspaceShell', () => {
  it('opens the sidebar sheet from the bottom bar', async () => {
    const user = userEvent.setup();

    render(
      <MobileWorkspaceShell
        mode="edit"
        documentPreview={<div>preview</div>}
        sidebar={<div>sidebar content</div>}
      />
    );

    expect(screen.getByRole('button', { name: '番号設定' })).toBeInTheDocument();
    expect(screen.queryByText('sidebar content')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '番号設定' }));

    expect(screen.getByText('sidebar content')).toBeInTheDocument();
    expect(screen.getAllByText('番号設定')).toHaveLength(2);
  });

  it('shows the project organizer button only when a project panel exists', async () => {
    const user = userEvent.setup();

    render(
      <MobileWorkspaceShell
        mode="template"
        documentPreview={<div>preview</div>}
        sidebar={<div>sidebar content</div>}
        leftProjectPanel={<div>project organizer</div>}
      />
    );

    await user.click(screen.getByRole('button', { name: 'ページ整理' }));

    expect(screen.getByText('project organizer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '用紙設定' })).toBeInTheDocument();
  });
});
