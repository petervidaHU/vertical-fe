import { Badge } from "@mantine/core";

type TagFilterButtonProps = {
  activeCount: number;
  onClick: () => void;
};

export function TagFilterButton({ activeCount, onClick }: TagFilterButtonProps) {
  return (
    <button
      type="button"
      aria-label={`Filter by tags${activeCount > 0 ? ` (${activeCount} active)` : ""}`}
      onClick={onClick}
      style={{
        appearance: "none",
        position: "fixed",
        right: 18,
        bottom: 18,
        zIndex: 1000,
        padding: "10px 24px",
        borderRadius: 999,
        border: activeCount > 0
          ? "1px solid rgba(95, 163, 197, 0.48)"
          : "1px solid rgba(186, 155, 114, 0.24)",
        background: activeCount > 0
          ? "linear-gradient(180deg, rgba(223, 238, 248, 0.98) 0%, rgba(203, 224, 236, 0.96) 100%)"
          : "linear-gradient(180deg, rgba(255, 250, 240, 0.98) 0%, rgba(248, 236, 208, 0.96) 100%)",
        boxShadow: "0 14px 26px rgba(92, 65, 36, 0.16)",
        backdropFilter: "blur(14px)",
        cursor: "pointer",
        opacity: 0.3,
        transition: "opacity 200ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = "1";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = "0.3";
      }}
      onFocus={(e) => {
        e.currentTarget.style.opacity = "1";
      }}
      onBlur={(e) => {
        e.currentTarget.style.opacity = "0.3";
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "#7a6549",
          fontFamily: "Avenir Next, Trebuchet MS, sans-serif",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        🏷️ Tags
        {activeCount > 0 ? (
          <Badge
            size="xs"
            variant="filled"
            color="teal"
            style={{ marginLeft: 4 }}
          >
            {activeCount}
          </Badge>
        ) : null}
      </span>
    </button>
  );
}
