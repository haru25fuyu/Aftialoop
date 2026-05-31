import {
  colors,
  semantic,
  spacing,
  radius,
  fontSize,
  fontWeight,
} from "../styles/tokens";

type Step = { label: string; optional?: boolean; complete?: boolean };

export function Stepper({
  steps,
  current,
  onSelect,
}: {
  steps: Step[];
  current: number;
  onSelect?: (i: number) => void;
}) {
  return (
    <ol
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing[3],
        fontSize: fontSize.sm,
        overflowX: "auto",
        listStyle: "none",
        padding: 0,
        margin: 0,
      }}
    >
      {steps.map((s, i) => {
        const active = i === current;
        const done = i < current || s.complete;
        const circleStyle = {
          width: 24,
          height: 24,
          display: "grid",
          placeItems: "center",
          borderRadius: radius.full,
          border: `1px solid`,
          transition: "all 0.2s",
          borderColor: done
            ? colors.neutral900
            : active
              ? colors.neutral800
              : colors.neutral300,
          backgroundColor: done
            ? colors.neutral900
            : active
              ? colors.neutral800
              : colors.neutral0,
          color: done || active ? colors.neutral0 : semantic.textSecondary,
          fontSize: fontSize.xs,
          fontWeight: fontWeight.bold,
          flexShrink: 0,
        };
        return (
          <li
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: spacing[2],
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={() => onSelect?.(i)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: spacing[2],
                background: "none",
                border: "none",
                cursor: onSelect ? "pointer" : "default",
                padding: "2px 4px",
                borderRadius: radius.sm,
              }}
            >
              <span style={circleStyle}>{done ? "✓" : i + 1}</span>
              <span
                style={{
                  fontWeight: active ? fontWeight.medium : fontWeight.normal,
                }}
              >
                {s.label}
                {s.optional && (
                  <span style={{ marginLeft: 4, color: semantic.textMuted }}>
                    (任意)
                  </span>
                )}
              </span>
            </button>
            {i < steps.length - 1 && (
              <span
                style={{
                  flexShrink: 0,
                  height: 1,
                  width: 24,
                  backgroundColor: colors.neutral300,
                }}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
