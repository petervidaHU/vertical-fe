import { Text, Tooltip } from "@mantine/core";
import { resolveAltitudeInfoIconSymbol, type ActiveAltitudeInfoItem } from "../../altitude-info/domain/altitudeInfo";

type AltitudeInfoIndicatorsProps = {
  items: ActiveAltitudeInfoItem[];
};

const AltitudeInfoIndicators = ({ items }: AltitudeInfoIndicatorsProps) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 18,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        justifyContent: "center",
        width: "min(92vw, 760px)",
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
                border: "1px solid rgba(186, 155, 114, 0.28)",
                background: "linear-gradient(180deg, rgba(255, 250, 240, 0.98) 0%, rgba(248, 236, 208, 0.95) 100%)",
                boxShadow: "0 14px 28px rgba(92, 65, 36, 0.14)",
                backdropFilter: "blur(14px)",
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
                  background: "rgba(122, 101, 73, 0.12)",
                  color: "#7a6549",
                  fontSize: 14,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {resolveAltitudeInfoIconSymbol(item.icon)}
              </span>
              <span
                style={{
                  color: "#5a4832",
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