import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { describe, expect, it, jest } from "@jest/globals";
import { TagFilterModal } from "./TagFilterModal";

const allTags = [
  { id: "history", name: "history" },
  { id: "science", name: "science" },
];

function renderWithMantine(ui: React.ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe("TagFilterModal", () => {
  it("does not apply draft changes when cancelled", () => {
    const onApply = jest.fn<(tagIds: string[]) => void>();
    const onClose = jest.fn<() => void>();

    renderWithMantine(
      <TagFilterModal
        opened
        onClose={onClose}
        allTags={allTags}
        enabledTagIds={["history"]}
        onApply={onApply}
        storyCounts={new Map([['history', 2], ['science', 1]])}
        altitudeInfoCounts={new Map([['history', 1], ['science', 0]])}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: /science/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onApply).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("applies the draft selection", () => {
    const onApply = jest.fn<(tagIds: string[]) => void>();
    const onClose = jest.fn<() => void>();

    renderWithMantine(
      <TagFilterModal
        opened
        onClose={onClose}
        allTags={allTags}
        enabledTagIds={[]}
        onApply={onApply}
        storyCounts={new Map([['history', 2], ['science', 1]])}
        altitudeInfoCounts={new Map([['history', 1], ['science', 0]])}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^Select all$/i }));
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));

    expect(onApply).toHaveBeenCalledWith(["history", "science"]);
    expect(onClose).toHaveBeenCalled();
  });
});