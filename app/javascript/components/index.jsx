import React from "react";
import { createRoot } from "react-dom/client";
import HelloReact from "./HelloReact";
import KanbanBoard from "./KanbanBoard";

const components = {
  HelloReact,
  KanbanBoard,
};

document.addEventListener("DOMContentLoaded", () => {
  const mountPoint = document.getElementById("react-root");
  if (mountPoint) {
    const componentName = mountPoint.dataset.component || "HelloReact";
    const Component = components[componentName];
    if (Component) {
      const props = mountPoint.dataset.tasks
        ? { initialTasks: JSON.parse(mountPoint.dataset.tasks) }
        : {};
      const root = createRoot(mountPoint);
      root.render(<Component {...props} />);
    }
  }
});
