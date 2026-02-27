import React from "react";
import { createRoot } from "react-dom/client";
import KanbanBoard from "./KanbanBoard";
import { I18nProvider } from "./i18n";

const components = {
  KanbanBoard,
};

const parseJson = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const parseBoolean = (value) => value === "true";

document.addEventListener("DOMContentLoaded", () => {
  const mountPoint = document.getElementById("react-root");
  if (mountPoint) {
    const componentName = mountPoint.dataset.component || "KanbanBoard";
    const Component = components[componentName];
    if (Component) {
      const props = {};
      if (mountPoint.dataset.tasks) {
        props.initialTasks = parseJson(mountPoint.dataset.tasks, []);
      }
      const messages = mountPoint.dataset.i18n
        ? parseJson(mountPoint.dataset.i18n, {})
        : {};
      const strict = parseBoolean(mountPoint.dataset.i18nStrict);

      const root = createRoot(mountPoint);
      root.render(
        <I18nProvider messages={messages} strict={strict}>
          <Component {...props} />
        </I18nProvider>
      );
    }
  }
});
