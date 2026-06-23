import { Component, type ErrorInfo, type ReactNode } from "react";
import { Icon, type IconName } from "../lib/icons";

interface Props {
  children: ReactNode;
  /** Custom title for the fallback UI. */
  title?: string;
  /** Icon shown in the fallback UI. Defaults to "issue". */
  icon?: IconName;
  /**
   * When the boundary is in an error state, a change to any value in this
   * array clears the error and re-renders fresh children. Use it to auto-recover
   * on external changes (e.g. route navigation) that the manual "Try again"
   * button can't fix for a deterministic error. Compared shallowly per element.
   */
  resetKeys?: unknown[];
}

interface State {
  error: Error | null;
}

/** Returns true if the two reset-key arrays differ (shallow, per-element). */
function resetKeysChanged(prev: unknown[] | undefined, next: unknown[] | undefined): boolean {
  const a = prev ?? [];
  const b = next ?? [];
  if (a.length !== b.length) return true;
  return a.some((value, i) => !Object.is(value, b[i]));
}

/** Catches render errors in its subtree and shows a recovery UI. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  componentDidUpdate(prevProps: Props) {
    // Auto-recover: if we're showing an error and any resetKey changed
    // (e.g. the route), clear it so the boundary re-renders fresh children.
    if (this.state.error && resetKeysChanged(prevProps.resetKeys, this.props.resetKeys)) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    const { icon = "issue", title = "Something went wrong" } = this.props;
    return (
      <div className="error-boundary">
        <span className="eb-icon">
          <Icon name={icon} size={24} />
        </span>
        <h4 className="eb-title">{title}</h4>
        <p className="eb-desc">An unexpected error occurred. You can try reloading this view.</p>
        <button className="btn-chip" onClick={() => this.setState({ error: null })}>
          Try again
        </button>
      </div>
    );
  }
}
