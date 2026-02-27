import React, { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import Column from "./Column";
import TaskModal from "./TaskModal";
import TaskCard from "./TaskCard";
import { api } from "./api";

const STATUSES = ["todo", "in_progress", "done"];

export default function KanbanBoard({ initialTasks = [] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [modal, setModal] = useState(null); // null | { mode, task?, defaultStatus? }
  const [activeTask, setActiveTask] = useState(null);
  const [dragOriginTasks, setDragOriginTasks] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = ({ active }) => {
    const task = tasks.find((t) => String(t.id) === active.id);
    setActiveTask(task ?? null);
    setDragOriginTasks(tasks);
  };

  // Visual feedback during drag: move the card into the target column (appended at end).
  // Existing cards in the target column are NOT repositioned — this keeps over.id stable
  // at dragEnd so handleDragEnd can reliably use it to compute the insertion position.
  // Backward moves (to a previous status) are blocked here to avoid misleading visual feedback.
  const handleDragOver = ({ active, over }) => {
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const activeTask = tasks.find((t) => String(t.id) === activeId);
    if (!activeTask) return;

    const overIsColumn = STATUSES.includes(overId);
    const overTask = !overIsColumn ? tasks.find((t) => String(t.id) === overId) : null;
    const targetStatus = overIsColumn ? overId : overTask?.status;

    if (!targetStatus || activeTask.status === targetStatus) return;

    // Don't allow optimistic moves backward
    const oldIndex = STATUSES.indexOf(activeTask.status);
    const newIndex = STATUSES.indexOf(targetStatus);
    if (newIndex < oldIndex) return;

    setTasks((prev) =>
      prev.map((t) =>
        String(t.id) === activeId ? { ...t, status: targetStatus } : t
      )
    );
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveTask(null);

    if (!over) {
      setDragOriginTasks(null);
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    // Use dragOriginTasks (stable snapshot from drag start) for all position
    // calculations — the React `tasks` state may be stale from handleDragOver.
    const originalTask = dragOriginTasks?.find((t) => String(t.id) === activeId);
    if (!originalTask) {
      setDragOriginTasks(null);
      return;
    }

    const overIsColumn = STATUSES.includes(overId);

    // Resolve the target status from the stable origin snapshot.
    const overOriginalTask = !overIsColumn
      ? dragOriginTasks.find((t) => String(t.id) === overId)
      : null;
    const targetStatus = overIsColumn ? overId : overOriginalTask?.status;

    if (!targetStatus) {
      setDragOriginTasks(null);
      return;
    }

    const isCrossColumn = targetStatus !== originalTask.status;

    // ── Cross-column ────────────────────────────────────────────────────────
    if (isCrossColumn) {
      // Reject backward moves immediately on the client — no API call needed.
      const oldStatusIndex = STATUSES.indexOf(originalTask.status);
      const newStatusIndex = STATUSES.indexOf(targetStatus);
      if (newStatusIndex < oldStatusIndex) {
        setTasks(dragOriginTasks);
        setDragOriginTasks(null);
        alert("Status can only advance forward.");
        return;
      }

      // Reconstruct the final column order from the stable origin data + over.id.
      const targetColumnOrigin = dragOriginTasks
        .filter((t) => t.status === targetStatus)
        .sort((a, b) => a.position - b.position);

      const insertIndex = overOriginalTask
        ? targetColumnOrigin.findIndex((t) => String(t.id) === overId)
        : -1;
      const idx = insertIndex === -1 ? targetColumnOrigin.length : insertIndex;

      const finalColumnTasks = [
        ...targetColumnOrigin.slice(0, idx),
        { ...originalTask, status: targetStatus },
        ...targetColumnOrigin.slice(idx),
      ].map((t, i) => ({ ...t, position: i }));

      // Apply optimistic update with the correct final positions.
      setTasks((prev) => [
        ...prev.filter((t) => t.status !== targetStatus && String(t.id) !== activeId),
        ...finalColumnTasks,
      ]);

      const taskId = Number(activeId);
      const statusResponse = await api.patch(`/tasks/${taskId}.json`, {
        task: { status: targetStatus },
      });

      if (!statusResponse.ok) {
        setTasks(dragOriginTasks);
        const data = await statusResponse.json().catch(() => ({}));
        alert(data.errors?.join(", ") ?? "Unable to update status.");
        setDragOriginTasks(null);
        return;
      }

      // Persist exact positions in the target column.
      const reorderBody = finalColumnTasks.map((t) => ({ id: t.id, position: t.position }));
      await api.post("/tasks/reorder.json", { tasks: reorderBody });

      setDragOriginTasks(null);
      return;
    }

    // ── Same-column reorder ─────────────────────────────────────────────────
    if (!overIsColumn && overOriginalTask) {
      const columnTasks = dragOriginTasks
        .filter((t) => t.status === originalTask.status)
        .sort((a, b) => a.position - b.position);

      const oldIndex = columnTasks.findIndex((t) => String(t.id) === activeId);
      const newIndex = columnTasks.findIndex((t) => String(t.id) === overId);

      if (oldIndex !== newIndex) {
        const reordered = arrayMove(columnTasks, oldIndex, newIndex);
        const reorderedWithPositions = reordered.map((t, i) => ({ ...t, position: i }));

        setTasks((prev) => {
          const others = prev.filter((t) => t.status !== originalTask.status);
          return [...others, ...reorderedWithPositions];
        });

        const body = reorderedWithPositions.map((t) => ({ id: t.id, position: t.position }));
        const response = await api.post("/tasks/reorder.json", { tasks: body });

        if (!response.ok) {
          setTasks(dragOriginTasks);
        }
      }
    }

    setDragOriginTasks(null);
  };

  const openCreateModal = (defaultStatus) => {
    setModal({ mode: "create", defaultStatus });
  };

  const openEditModal = (task) => {
    setModal({ mode: "edit", task });
  };

  const handleSave = (savedTask, mode) => {
    if (mode === "create") {
      setTasks((prev) => [...prev, savedTask]);
    } else {
      setTasks((prev) =>
        prev.map((t) => (t.id === savedTask.id ? savedTask : t))
      );
    }
  };

  const handleDelete = (taskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Kanban Board</h1>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 items-start">
          {STATUSES.map((status) => (
            <Column
              key={status}
              status={status}
              tasks={tasks
                .filter((t) => t.status === status)
                .sort((a, b) => a.position - b.position)}
              onCardClick={openEditModal}
              onAddClick={openCreateModal}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} onClick={() => {}} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {modal && (
        <TaskModal
          modal={modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
