import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import TaskCard from "./TaskCard";

const COLUMN_STYLES = {
  todo: { header: "bg-gray-200 text-gray-700", border: "border-gray-200" },
  in_progress: { header: "bg-blue-200 text-blue-800", border: "border-blue-200" },
  done: { header: "bg-green-200 text-green-800", border: "border-green-200" },
};

const STATUS_LABELS = {
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
};

export default function Column({ status, tasks, onCardClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const styles = COLUMN_STYLES[status];

  return (
    <div
      className={`flex flex-col rounded-xl border ${styles.border} bg-gray-50 min-h-[420px] w-full`}
    >
      <div className={`flex items-center justify-between px-4 py-3 rounded-t-xl ${styles.header}`}>
        <span className="font-semibold text-sm">
          {STATUS_LABELS[status]}
        </span>
        <span className="text-xs font-medium bg-white bg-opacity-60 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 p-3 flex-1 transition-colors ${isOver ? "bg-blue-50" : ""}`}
      >
        <SortableContext
          id={status}
          items={tasks.map(t => String(t.id))}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={onCardClick} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
