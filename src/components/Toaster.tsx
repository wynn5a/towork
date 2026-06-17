import { useStore } from "../lib/store";
import { Icon } from "../lib/icons";

const HUE: Record<string, string> = {
  accent: "var(--accent)",
  green: "var(--green)",
  red: "var(--red)",
};

export function Toaster() {
  const { toasts } = useStore();
  return (
    <div className="toast-wrap">
      {toasts.map((t) => {
        const hue = HUE[t.hue];
        return (
          <div className="toast" key={t.id}>
            <span
              className="tic"
              style={{ background: `color-mix(in srgb, ${hue} 16%, transparent)`, color: hue }}
            >
              <Icon name={t.hue === "red" ? "trash" : "check"} size={15} stroke={hue} />
            </span>
            <div style={{ flex: 1 }}>
              <b>{t.title}</b>
              {t.body && <p>{t.body}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
