import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { TimelineItemType } from "../domain/types";
import TimelineEpicBadge from "./TimelineEpicBadge";

function renderWithMantine(node: React.ReactNode) {
  return render(<MantineProvider>{node}</MantineProvider>);
}

describe("TimelineEpicBadge", () => {
  const epic = {
    id: "epic-1",
    type: TimelineItemType.Epic,
    title: "Core Climb",
    description: "",
    startPoint: 100,
    endPoint: 200,
  };

  it("shows percentage based on altitude position", () => {
    renderWithMantine(<TimelineEpicBadge epic={epic} altitude={150} />);

    expect(screen.getByText("Core Climb")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("clamps progress below and above bounds", () => {
    const { rerender } = renderWithMantine(<TimelineEpicBadge epic={epic} altitude={10} />);

    expect(screen.getByText("0%")).toBeInTheDocument();

    rerender(
      <MantineProvider>
        <TimelineEpicBadge epic={epic} altitude={1000} />
      </MantineProvider>,
    );

    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("handles zero-span epics safely", () => {
    const zeroSpanEpic = {
      ...epic,
      startPoint: 200,
      endPoint: 200,
    };

    renderWithMantine(<TimelineEpicBadge epic={zeroSpanEpic} altitude={200} />);

    expect(screen.getByText("0%")).toBeInTheDocument();
  });
});
