import React, { useRef, useState } from "react";
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
  const [saving, setSaving] = useState(false);
  const dragMetaRef = useRef({
    lastTargetStatus: null,
    lastNonActiveOverId: null,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = ({ active }) => {
    const task = tasks.find((t) => String(t.id) === active.id);
    setActiveTask(task ?? null);
    setDragOriginTasks(tasks);
    dragMetaRef.current = {
      lastTargetStatus: null,
      lastNonActiveOverId: null,
    };
  };

  // Track the last valid drop target during drag.
  // We avoid mutating tasks here because cross-column optimistic moves can
  // cancel/interrupt dnd-kit end events in system tests.
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

    if (targetStatus && (overIsColumn || overId !== activeId)) {
      dragMetaRef.current.lastTargetStatus = targetStatus;
    }
    if (!overIsColumn && overId !== activeId) {
      dragMetaRef.current.lastNonActiveOverId = overId;
    }
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveTask(null);
    setSaving(true);

    try {
      if (!over) {
        // Drop outside any droppable area: restore pre-drag state.
        if (dragOriginTasks) setTasks(dragOriginTasks);
        dragMetaRef.current = { lastTargetStatus: null, lastNonActiveOverId: null };
        setDragOriginTasks(null);
        return;
      }

      const activeId = String(active.id);
      const overId = String(over.id);

      // Use dragOriginTasks (stable snapshot from drag start) for all position
      // calculations — the React `tasks` state may be stale from handleDragOver.
      const originalTask = dragOriginTasks?.find((t) => String(t.id) === activeId);
      if (!originalTask) {
        dragMetaRef.current = { lastTargetStatus: null, lastNonActiveOverId: null };
        setDragOriginTasks(null);
        return;
      }

      const overIsColumn = STATUSES.includes(overId);
      const fallbackOverId = dragMetaRef.current.lastNonActiveOverId;
      const effectiveOverId =
        overId === activeId && fallbackOverId ? fallbackOverId : overId;

      // Resolve the target status from the stable origin snapshot.
      const overOriginalTask = !overIsColumn
        ? dragOriginTasks.find((t) => String(t.id) === effectiveOverId)
        : null;
      const overContainerId = over?.data?.current?.sortable?.containerId;
      const targetStatus =
        (overIsColumn && overId) ||
        (STATUSES.includes(overContainerId) ? overContainerId : null) ||
        overOriginalTask?.status ||
        dragMetaRef.current.lastTargetStatus;

      if (!targetStatus) {
        dragMetaRef.current = { lastTargetStatus: null, lastNonActiveOverId: null };
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

        // In forward cross-column moves, after optimistic status change, dnd-kit
        // can report over.id as the active card itself. In that case, infer the
        // insertion index from the current visual order in the target column.
        let idx;
        if (overOriginalTask && effectiveOverId !== activeId) {
          const insertIndex = targetColumnOrigin.findIndex(
            (t) => String(t.id) === effectiveOverId
          );
          idx = insertIndex === -1 ? targetColumnOrigin.length : insertIndex;
        } else {
          const currentTargetColumn = tasks
            .filter((t) => t.status === targetStatus)
            .sort((a, b) => a.position - b.position);
          const currentIndex = currentTargetColumn.findIndex((t) => String(t.id) === activeId);
          idx = currentIndex === -1 ? targetColumnOrigin.length : currentIndex;
        }

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

        dragMetaRef.current = { lastTargetStatus: null, lastNonActiveOverId: null };
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

      dragMetaRef.current = { lastTargetStatus: null, lastNonActiveOverId: null };
      setDragOriginTasks(null);
    } finally {
      setSaving(false);
    }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 p-8" data-saving={saving}>
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
