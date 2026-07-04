// Globals provided by Jenkins core's page scripts (hudson-behavior.js etc.) that the bundled
// apps rely on at runtime.
export {};

declare global {
  interface Window {
    crumb: Crumb;
    notificationBar: NotificationBar;
    Behaviour: Behaviour;
    buildFormTree: (form: HTMLFormElement) => boolean;
  }

  interface Crumb {
    wrap: (headers: Record<string, string>) => Record<string, string>;
  }

  interface NotificationBar {
    show: (message: string, type: unknown) => void;
    ERROR: unknown;
  }

  interface Behaviour {
    applySubtree: (root: Element, includeSelf?: boolean) => void;
  }
}
