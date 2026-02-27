import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";


export default function TaskCard({ task, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: String(task.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
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
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-grab active:cursor-grabbing select-none"
      onClick={(e) => {
        // Only open modal on click, not drag
        if (!isDragging) onClick(task);
      }}
    >
      <p className="font-medium text-gray-800 text-sm leading-snug mb-2">
        {task.title}
      </p>
      <div className="flex items-center justify-end gap-2 text-xs text-gray-400">
        <span>💬 {commentCount}</span>
        <span>{createdAt}</span>
      </div>
    </div>
  );
}
