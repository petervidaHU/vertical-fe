import { act, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import TagSelector from "./TagSelector";

function renderWithMantine(ui: React.ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe("TagSelector", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("waits for 3 characters before showing debounced suggestions", () => {
    renderWithMantine(
      <TagSelector
        selected={[]}
        allTags={[
          { id: "history", name: "history" },
          { id: "science", name: "science" },
        ]}
        onChange={() => undefined}
      />,
    );

    const input = screen.getByPlaceholderText(/Search or add tags/i);

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "hi" } });
    expect(screen.getByText(/Type at least 3 characters/i)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "hist" } });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(screen.getByText("history")).toBeInTheDocument();
  });

  it("creates a placeholder tag when creating a new valid tag", () => {
    const onChange = jest.fn<(tags: Array<{ id: string; name: string }>) => void>();

    renderWithMantine(
      <TagSelector
        selected={[]}
        allTags={[]}
        onChange={onChange}
      />,
    );

    const input = screen.getByPlaceholderText(/Search or add tags/i);

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "New Tag" } });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    fireEvent.click(screen.getByText('+ Create "New Tag"'));

    expect(onChange).toHaveBeenCalledWith([{ id: "new:new tag", name: "New Tag" }]);
  });
});