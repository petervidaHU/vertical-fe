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
          ? "1px solid rgba(79, 227, 211, 0.55)"
          : "1px solid rgba(188, 212, 255, 0.34)",
        background: activeCount > 0
          ? "linear-gradient(180deg, rgba(20, 46, 58, 0.66) 0%, rgba(13, 28, 38, 0.66) 100%)"
          : "linear-gradient(180deg, rgba(18, 26, 44, 0.62) 0%, rgba(11, 17, 31, 0.62) 100%)",
        boxShadow: activeCount > 0
          ? "0 14px 34px rgba(5, 7, 15, 0.42), 0 0 22px rgba(79, 227, 211, 0.22)"
          : "0 14px 34px rgba(5, 7, 15, 0.42)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
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
          color: activeCount > 0 ? "#a9f4ea" : "#dce6fb",
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
