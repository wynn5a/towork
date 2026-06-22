import { Component, type ErrorInfo, type ReactNode } from "react";
import { Icon, type IconName } from "../lib/icons";

interface Props {
  children: ReactNode;
  /** Custom title for the fallback UI. */
  title?: string;
  /** Icon shown in the fallback UI. Defaults to "issue". */
  icon?: IconName;
}

interface State {
  error: Error | null;
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
