import React, { useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import Column from "./Column";
import TaskModal from "./TaskModal";
import TaskCard from "./TaskCard";
import SearchModal from "./SearchModal";
import { api } from "./api";

const STATUSES = ["todo", "in_progress", "done"];

export default function KanbanBoard({ initialTasks = [] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [modal, setModal] = useState(null); // null | { mode, task?, defaultStatus? }
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [dragOriginTasks, setDragOriginTasks] = useState(null);
  const [saving, setSaving] = useState(false);

  // Tracks the final intended reorder during drag — updated on every handleDragOver.
  // null | { targetStatus: string, orderedIds: string[] }
  const pendingReorderRef = useRef(null);

  // Tracks the last known target status for resolving drop target in handleDragEnd.
  const lastTargetStatusRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = ({ active }) => {
    const task = tasks.find((t) => String(t.id) === active.id);
    setActiveTask(task ?? null);
    setDragOriginTasks(tasks);
    pendingReorderRef.current = null;
    lastTargetStatusRef.current = null;
  };

  const handleDragOver = ({ active, over }) => {
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const overIsColumn = STATUSES.includes(overId);
    const overContainerId = over?.data?.current?.sortable?.containerId;
    const overTask = !overIsColumn ? tasks.find((t) => String(t.id) === overId) : null;
    const targetStatus =
      (overIsColumn && overId) ||
      (STATUSES.includes(overContainerId) ? overContainerId : null) ||
      overTask?.status;

    if (!targetStatus) return;
    lastTargetStatusRef.current = targetStatus;

    const sourceTask = tasks.find((t) => String(t.id) === activeId);
    if (!sourceTask) return;

    if (targetStatus === sourceTask.status) {
      // Same-column: track intended order via ref — no state update (avoids double-transform).
      if (!overIsColumn && overId !== activeId) {
        const columnTasks = tasks
          .filter((t) => t.status === targetStatus)
          .sort((a, b) => a.position - b.position);
        const oldIdx = columnTasks.findIndex((t) => String(t.id) === activeId);
        const newIdx = columnTasks.findIndex((t) => String(t.id) === overId);
        if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
          pendingReorderRef.current = {
            targetStatus,
            orderedIds: arrayMove(columnTasks, oldIdx, newIdx).map((t) => String(t.id)),
          };
        }
      } else if (!overIsColumn && overId === activeId) {
        // Cancel pending reorder only when the drag started in this same column.
        // During cross-column drags, dnd-kit can report `over === active` after we
        // visually move the card into the target column; clearing here would lose
        // the intended insert-before-target order and cause append-on-drop.
        const originalTask = dragOriginTasks?.find((t) => String(t.id) === activeId);
        if (!originalTask || originalTask.status === targetStatus) {
          pendingReorderRef.current = null;
        }
      }
      return;
    }

    // Cross-column: move task visually into target column and record intended order.
    setTasks((prev) => {
      const sourceColumnTasks = prev
        .filter((t) => t.status === sourceTask.status && String(t.id) !== activeId)
        .sort((a, b) => a.position - b.position)
        .map((t, i) => ({ ...t, position: i }));

      const targetColumnTasks = prev
        .filter((t) => t.status === targetStatus)
        .sort((a, b) => a.position - b.position);

      const movedTask = { ...sourceTask, status: targetStatus };

      let insertIndex;
      if (overTask && overId !== activeId) {
        insertIndex = targetColumnTasks.findIndex((t) => String(t.id) === overId);
        if (insertIndex === -1) insertIndex = targetColumnTasks.length;
      } else {
        insertIndex = targetColumnTasks.length;
      }

      const newTargetTasks = [
        ...targetColumnTasks.slice(0, insertIndex),
        movedTask,
        ...targetColumnTasks.slice(insertIndex),
      ].map((t, i) => ({ ...t, position: i }));

      pendingReorderRef.current = {
        targetStatus,
        orderedIds: newTargetTasks.map((t) => String(t.id)),
      };

      const others = prev.filter(
        (t) => t.status !== sourceTask.status && t.status !== targetStatus
      );
      return [...others, ...sourceColumnTasks, ...newTargetTasks];
    });
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveTask(null);
    setSaving(true);

    const cleanup = () => {
      pendingReorderRef.current = null;
      lastTargetStatusRef.current = null;
      setDragOriginTasks(null);
    };

    try {
      if (!over) {
        if (dragOriginTasks) setTasks(dragOriginTasks);
        cleanup();
        return;
      }

      const activeId = String(active.id);
      const overId = String(over.id);
      const overIsColumn = STATUSES.includes(overId);

      const originalTask = dragOriginTasks?.find((t) => String(t.id) === activeId);
      if (!originalTask) { cleanup(); return; }

      const overContainerId = over?.data?.current?.sortable?.containerId;
      const overOriginalTask = !overIsColumn
        ? dragOriginTasks.find((t) => String(t.id) === overId)
        : null;
      const targetStatus =
        (overIsColumn && overId) ||
        (STATUSES.includes(overContainerId) ? overContainerId : null) ||
        overOriginalTask?.status ||
        pendingReorderRef.current?.targetStatus ||
        lastTargetStatusRef.current;

      if (!targetStatus) { cleanup(); return; }

      const isCrossColumn = targetStatus !== originalTask.status;

      // ── Cross-column ────────────────────────────────────────────────────────
      if (isCrossColumn) {
        const oldStatusIndex = STATUSES.indexOf(originalTask.status);
        const newStatusIndex = STATUSES.indexOf(targetStatus);
        if (newStatusIndex < oldStatusIndex) {
          setTasks(dragOriginTasks);
          cleanup();
          alert("Status can only advance forward.");
          return;
        }

        // Build final column order from pendingReorderRef (tracks exact drop position).
        const originTargetColumn = dragOriginTasks
          .filter((t) => t.status === targetStatus)
          .sort((a, b) => a.position - b.position);

        let finalColumnTasks;
        if (pendingReorderRef.current?.targetStatus === targetStatus) {
          const taskById = new Map(dragOriginTasks.map((t) => [String(t.id), t]));
          taskById.set(activeId, { ...originalTask, status: targetStatus });
          finalColumnTasks = pendingReorderRef.current.orderedIds
            .map((id) => taskById.get(id))
            .filter(Boolean)
            .map((t, i) => ({ ...t, position: i }));
        } else {
          // Dropped directly on column header / no hover recorded: append at end.
          finalColumnTasks = [
            ...originTargetColumn,
            { ...originalTask, status: targetStatus },
          ].map((t, i) => ({ ...t, position: i }));
        }

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
          cleanup();
          return;
        }

        const reorderBody = finalColumnTasks.map((t) => ({ id: t.id, position: t.position }));
        await api.post("/tasks/reorder.json", { tasks: reorderBody });

        cleanup();
        return;
      }

      // ── Same-column reorder ─────────────────────────────────────────────────
      // Released on the active card itself → returned to original slot, nothing to do.
      if (!overIsColumn && overId === activeId) {
        cleanup();
        return;
      }
      if (pendingReorderRef.current?.targetStatus === originalTask.status) {
        const taskById = new Map(dragOriginTasks.map((t) => [String(t.id), t]));
        const reordered = pendingReorderRef.current.orderedIds
          .map((id) => taskById.get(id))
          .filter(Boolean)
          .map((t, i) => ({ ...t, position: i }));

        setTasks((prev) => [
          ...prev.filter((t) => t.status !== originalTask.status),
          ...reordered,
        ]);

        const body = reordered.map((t) => ({ id: t.id, position: t.position }));
        const response = await api.post("/tasks/reorder.json", { tasks: body });
        if (!response.ok) setTasks(dragOriginTasks);
      }
      // No pendingReorderRef → card returned to original position, no API call needed.

      cleanup();
    } finally {
      setSaving(false);
    }
  };

  const openCreateModal = () => {
    setModal({ mode: "create", defaultStatus: "todo" });
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
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 p-8" data-saving={saving}>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Kanban Board</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors"
            aria-label="Add task"
          >
            Add Task
          </button>
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 shadow-sm transition-colors"
            aria-label="Search tasks"
          >
            🔍 Search
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        measuring={{ droppable: { strategy: MeasuringStrategy.BeforeDragging } }}
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
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} onClick={() => {}} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {searchOpen && (
        <SearchModal
          tasks={tasks}
          onClose={() => setSearchOpen(false)}
          onSelectTask={(task) => { setSearchOpen(false); openEditModal(task); }}
        />
      )}

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
