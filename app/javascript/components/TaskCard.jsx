import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";


export default function TaskCard({ task, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: String(task.id) });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const commentCount = task.comments?.length ?? 0;
  const createdAt = new Date(task.created_at).toLocaleDateString();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      title="Clicca per aprire i dettagli del task"
      className="group relative overflow-hidden bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-grab active:cursor-grabbing select-none transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-blue-300 hover:ring-1 hover:ring-blue-100"
      onClick={(e) => {
        // Only open modal on click, not drag
        if (!isDragging) onClick(task);
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-blue-50/50 to-blue-100/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      <div className="relative">
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="font-medium text-gray-800 text-sm leading-snug">
            {task.title}
          </p>
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-blue-600 opacity-0 translate-x-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0">
            Apri
          </span>
        </div>
        <div className="flex items-center justify-end gap-2 text-xs text-gray-400">
          <span>💬 {commentCount}</span>
          <span>{createdAt}</span>
        </div>
      </div>
    </div>
  );
}
