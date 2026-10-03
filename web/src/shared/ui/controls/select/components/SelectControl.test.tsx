import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SelectControl } from './SelectControl';

const options = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Running and queued' },
  { value: 'failure', label: 'Failure' },
];

describe('dropdown interactions', () => {
  it('selects with arrows and Enter, and Tab does not change the filter', async () => {
    const onChange = vi.fn();
    render(
      <>
        <SelectControl label="Status" value="all" options={options} onChange={onChange} />
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

  it('consumes Escape only while the menu is open', async () => {
    const parentEscape = vi.fn();
    render(
      <div
        onKeyDown={(event) => {
          if (event.key === 'Escape') parentEscape();
        }}
      >
        <SelectControl label="Status" value="all" options={options} onChange={vi.fn()} />
      </div>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(parentEscape).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(parentEscape).toHaveBeenCalledOnce();
  });

  it('preserves a selected repository while options load and supports search and clearing', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SelectControl
        label="Repository"
        value="acme/build"
        options={[]}
        onChange={onChange}
        searchable
        clearable
        loading
      />,
    );
    expect(screen.getByText('acme/build')).toHaveAttribute('title', 'acme/build');
    rerender(
      <SelectControl
        label="Repository"
        value="acme/build"
        options={[{ value: 'acme/build', label: 'acme/build' }]}
        onChange={onChange}
        searchable
        clearable
      />,
    );
    const user = userEvent.setup();
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
        <SelectControl label="Status" value="all" options={options} onChange={vi.fn()} />
        <SelectControl label="Status" value="all" options={options} onChange={vi.fn()} disabled />
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

  it('closes on outside click and outer scrolling without committing a selection', async () => {
    const onChange = vi.fn();
    render(
      <>
        <SelectControl label="Status" value="all" options={options} onChange={onChange} />
        <button>Outside</button>
      </>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('combobox'));
    fireEvent.scroll(document.body);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
  it('loads more options with the keyboard without changing the selected target or closing the menu', async () => {
    const onLoadMore = vi.fn();
    const onChange = vi.fn();
    render(
      <SelectControl
        label="Repository"
        value="all"
        options={options}
        onChange={onChange}
        onLoadMore={onLoadMore}
        loadMoreLabel="Load more repositories"
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('{End}{Enter}');
    expect(onLoadMore).toHaveBeenCalledOnce();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('listbox')).toBeVisible();
  });
});

it('aligns an embedded menu with the full labeled field', async () => {
  const bounds = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');
  bounds.mockImplementation(function (this: HTMLElement) {
    if (this.hasAttribute('data-select-anchor')) return new DOMRect(100, 40, 300, 32);
    return new DOMRect(160, 41, 240, 30);
  });
  try {
    const user = userEvent.setup();
    render(
      <div data-select-anchor>
        <span>Status</span>
        <SelectControl
          label="Filter state"
          value="all"
          options={[{ value: 'all', label: 'All states' }]}
          onChange={() => {}}
        />
      </div>,
    );
    await user.click(screen.getByRole('combobox', { name: 'Filter state' }));
    const menu = screen.getByRole('listbox').parentElement!.parentElement!;
    expect(getComputedStyle(menu).left).toBe('100px');
    expect(getComputedStyle(menu).width).toBe('300px');
  } finally {
    bounds.mockRestore();
  }
});

it('shows non-textual loading for an empty options menu', async () => {
  render(
    <SelectControl
      label="Targets"
      value=""
      options={[]}
      onChange={vi.fn()}
      loading
      placeholder="Choose target"
    />,
  );
  await userEvent.click(screen.getByRole('combobox', { name: 'Targets' }));
  expect(screen.getByRole('status', { name: 'Loading options…', hidden: true })).toHaveTextContent(
    '',
  );
  expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
});
