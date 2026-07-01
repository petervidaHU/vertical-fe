import { Text, Tooltip } from "@mantine/core";
import { resolveAltitudeInfoIconSymbol, type ActiveAltitudeInfoItem } from "../../altitude-info/domain/altitudeInfo";

type AltitudeInfoIndicatorsProps = {
  items: ActiveAltitudeInfoItem[];
  placement?: "top-center" | "below-epic";
};

const AltitudeInfoIndicators = ({ items, placement = "top-center" }: AltitudeInfoIndicatorsProps) => {
  if (items.length === 0) {
    return null;
  }

  const isBelowEpicPlacement = placement === "below-epic";

  return (
    <div
      style={{
        position: "fixed",
        top: isBelowEpicPlacement ? 124 : 18,
        left: isBelowEpicPlacement ? "auto" : "50%",
        right: isBelowEpicPlacement ? 16 : "auto",
        transform: isBelowEpicPlacement ? "none" : "translateX(-50%)",
        zIndex: 1000,
        display: "flex",
        flexDirection: isBelowEpicPlacement ? "column" : "row",
        gap: 10,
        flexWrap: isBelowEpicPlacement ? "nowrap" : "wrap",
        justifyContent: isBelowEpicPlacement ? "flex-start" : "center",
        alignItems: isBelowEpicPlacement ? "flex-end" : "stretch",
        width: isBelowEpicPlacement ? "min(360px, 42vw)" : "min(92vw, 760px)",
        pointerEvents: "none",
      }}
    >
      <Tooltip.Group openDelay={120} closeDelay={60}>
        {items.map((item) => (
          <Tooltip
            key={item.id}
            withArrow
            multiline
            w={260}
            position="bottom"
            offset={10}
            events={{ hover: true, focus: true, touch: true }}
            label={(
              <div style={{ display: "grid", gap: 4 }}>
                <Text size="xs" fw={700} c="white">
                  {item.title}
                </Text>
                <Text size="sm" fw={600} c="white">
                  {item.value}
                </Text>
              </div>
            )}
          >
            <button
              type="button"
              aria-label={`${item.title}: ${item.value}`}
              style={{
                pointerEvents: "auto",
                appearance: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                minHeight: 44,
                padding: "0 14px",
                borderRadius: 999,
                border: "1px solid rgba(188, 212, 255, 0.32)",
                background: "linear-gradient(180deg, rgba(18, 26, 44, 0.62) 0%, rgba(11, 17, 31, 0.62) 100%)",
                boxShadow: "0 14px 30px rgba(5, 7, 15, 0.42)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                cursor: "default",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  background: "rgba(79, 227, 211, 0.16)",
                  color: "#7fe7da",
                  fontSize: 14,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {resolveAltitudeInfoIconSymbol(item.icon)}
              </span>
              <span
                style={{
                  color: "#eef3ff",
                  fontFamily: "Avenir Next, Trebuchet MS, sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                  maxWidth: 120,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {item.value}
              </span>
            </button>
          </Tooltip>
        ))}
      </Tooltip.Group>
    </div>
  );
};

export default AltitudeInfoIndicators;