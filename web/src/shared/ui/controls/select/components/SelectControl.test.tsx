import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { expect, it, vi } from 'vitest';

import { SelectControl } from './SelectControl';

const options = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Running and queued' },
  { value: 'failure', label: 'Failure' },
];

function status(props: Partial<ComponentProps<typeof SelectControl>> = {}) {
  return (
    <SelectControl
      label="Status"
      value="all"
      options={options}
      onChange={vi.fn()}
      variant="field"
      {...props}
    />
  );
}

it('selects with arrows and Enter, and Tab does not change the filter', async () => {
  const onChange = vi.fn();
  render(
    <>
      {status({ onChange })}
      <button>Next control</button>
    </>,
  );
  const user = userEvent.setup();
  const input = screen.getByRole('combobox');
  await user.click(input);
  await user.keyboard('{ArrowDown}{Enter}');
  expect(onChange).toHaveBeenCalledWith('active');
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  onChange.mockClear();
  await user.click(input);
  await user.keyboard('{ArrowDown}{Tab}');
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Next control' })).toHaveFocus();
});

it('preserves a selected repository while options load and supports search and clearing', async () => {
  const onChange = vi.fn();
  const repository = { label: 'Repository', value: 'acme/build', onChange, searchable: true };
  const { rerender } = render(
    status({ ...repository, options: [], clearable: true, menu: { loading: true } }),
  );
  expect(screen.getByText('acme/build')).toHaveAttribute('title', 'acme/build');
  // Empty loading menus show a non-textual indicator.
  await userEvent.click(screen.getByRole('combobox'));
  expect(screen.getByRole('status', { name: 'Loading options…', hidden: true })).toHaveTextContent(
    '',
  );
  rerender(
    status({
      ...repository,
      options: [{ value: 'acme/build', label: 'acme/build' }],
      clearable: true,
    }),
  );
  const user = userEvent.setup();
  await user.keyboard('{Escape}');
  await user.type(screen.getByRole('combobox'), 'missing');
  expect(screen.getByText(/No matching options/)).toBeVisible();
  await user.keyboard('{Escape}');
  await user.click(screen.getByRole('combobox'));
  expect(screen.getByRole('option', { name: 'acme/build' })).toBeVisible();
  await user.keyboard('{Escape}{Backspace}');
  expect(onChange).toHaveBeenCalledWith('');
});

it('uses unique input IDs and does not open disabled controls', async () => {
  render(
    <>
      {status()}
      {status({ disabled: true })}
      <button>Next control</button>
    </>,
  );
  const inputs = screen.getAllByRole('combobox');
  expect(inputs[0].id).not.toBe(inputs[1].id);
  expect(inputs[1]).toBeDisabled();
  const user = userEvent.setup();
  await user.tab();
  await user.tab();
  expect(screen.getByRole('button', { name: 'Next control' })).toHaveFocus();
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
});

it('closes on Escape, outside click, and outer scrolling without committing a selection', async () => {
  const onChange = vi.fn();
  const parentEscape = vi.fn();
  render(
    <div
      onKeyDown={(event) => {
        if (event.key === 'Escape') parentEscape();
      }}
    >
      {status({ onChange })}
      <button>Outside</button>
    </div>,
  );
  const user = userEvent.setup();
  const input = screen.getByRole('combobox');
  // Escape is consumed only while the menu is open.
  await user.click(input);
  await user.keyboard('{ArrowDown}{Escape}');
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  expect(parentEscape).not.toHaveBeenCalled();
  await user.keyboard('{Escape}');
  expect(parentEscape).toHaveBeenCalledOnce();
  await user.click(input);
  await user.click(screen.getByRole('button', { name: 'Outside' }));
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  await user.click(input);
  fireEvent.scroll(document.body);
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  expect(onChange).not.toHaveBeenCalled();
});

it('loads more options with the keyboard without changing the selection or closing the menu', async () => {
  const onLoadMore = vi.fn();
  const onChange = vi.fn();
  render(status({ onChange, menu: { onLoadMore, loadMoreLabel: 'Load more repositories' } }));
  const user = userEvent.setup();
  await user.click(screen.getByRole('combobox'));
  await user.keyboard('{End}{Enter}');
  expect(onLoadMore).toHaveBeenCalledOnce();
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByRole('listbox')).toBeVisible();
});

it('aligns an embedded menu with the full labeled field', async () => {
  const bounds = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');
  bounds.mockImplementation(function (this: HTMLElement) {
    if (this.hasAttribute('data-select-anchor')) return new DOMRect(100, 40, 300, 32);
    return new DOMRect(160, 41, 240, 30);
  });
  try {
    render(
      <div data-select-anchor>
        <span>Status</span>
        {status()}
      </div>,
    );
    await userEvent.click(screen.getByRole('combobox'));
    const menu = screen.getByRole('listbox').parentElement!.parentElement!;
    expect(getComputedStyle(menu)).toMatchObject({ left: '100px', width: '300px' });
  } finally {
    bounds.mockRestore();
  }
});
