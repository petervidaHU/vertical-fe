import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import TimelineAltitudeDisplay from "./TimelineAltitudeDisplay";

function renderWithMantine(node: React.ReactNode) {
  return render(<MantineProvider>{node}</MantineProvider>);
}

describe("TimelineAltitudeDisplay", () => {
  it("formats meters and kilometers", () => {
    const onPaceChange = jest.fn();
    const { rerender } = renderWithMantine(
      <TimelineAltitudeDisplay altitude={250} pace={10} onPaceChange={onPaceChange} />,
    );

    expect(screen.getByText("250 m")).toBeInTheDocument();

    rerender(
      <MantineProvider>
        <TimelineAltitudeDisplay altitude={1500} pace={10} onPaceChange={onPaceChange} />
      </MantineProvider>,
    );

    expect(screen.getByText("1.5 km")).toBeInTheDocument();
  });

  it("handles pace controls", () => {
    const onPaceChange = jest.fn();

    renderWithMantine(<TimelineAltitudeDisplay altitude={250} pace={10} onPaceChange={onPaceChange} />);

    fireEvent.click(screen.getByRole("button", { name: "÷10" }));
    fireEvent.click(screen.getByRole("button", { name: "×10" }));

    expect(onPaceChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPaceChange).toHaveBeenNthCalledWith(2, 100);
  });

  it("disables divide button when pace is minimal", () => {
    const onPaceChange = jest.fn();

    renderWithMantine(<TimelineAltitudeDisplay altitude={250} pace={1} onPaceChange={onPaceChange} />);

    expect(screen.getByRole("button", { name: "÷10" })).toBeDisabled();
  });
});
