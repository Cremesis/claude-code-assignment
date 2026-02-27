import React from "react";
import { createRoot } from "react-dom/client";
import KanbanBoard from "./KanbanBoard";
import { I18nProvider } from "./i18n";

const components = {
  KanbanBoard,
};
const roots = new WeakMap();

const parseJson = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const parseBoolean = (value) => value === "true";

const mountReactRoot = () => {
  const mountPoint = document.getElementById("react-root");
  if (mountPoint) {
    const componentName = mountPoint.dataset.component || "KanbanBoard";
    const Component = components[componentName];
    if (Component) {
      const props = {};
      if (mountPoint.dataset.tasks) {
        props.initialTasks = parseJson(mountPoint.dataset.tasks, []);
      }
      if (mountPoint.dataset.currentLocale) {
        props.currentLocale = mountPoint.dataset.currentLocale;
      }
      if (mountPoint.dataset.localeOptions) {
        props.localeOptions = parseJson(mountPoint.dataset.localeOptions, []);
      }
      const messages = mountPoint.dataset.i18n
        ? parseJson(mountPoint.dataset.i18n, {})
        : {};
      const strict = parseBoolean(mountPoint.dataset.i18nStrict);

      const root = roots.get(mountPoint) || createRoot(mountPoint);
      roots.set(mountPoint, root);
      root.render(
        <I18nProvider messages={messages} strict={strict}>
          <Component {...props} />
        </I18nProvider>
      );
    }
  }
};

const unmountReactRoot = () => {
  const mountPoint = document.getElementById("react-root");
  if (!mountPoint) return;

  const root = roots.get(mountPoint);
  if (root) {
    root.unmount();
    roots.delete(mountPoint);
  }
};

document.addEventListener("DOMContentLoaded", mountReactRoot);
document.addEventListener("turbo:load", mountReactRoot);
document.addEventListener("turbo:before-cache", unmountReactRoot);
