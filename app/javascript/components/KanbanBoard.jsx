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
  const dragMetaRef = useRef({
    lastTargetStatus: null,
    lastNonActiveOverId: null,
    lastInsertIndex: null,
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
      lastInsertIndex: null,
    };
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

    if (targetStatus && (overIsColumn || overId !== activeId)) {
      dragMetaRef.current.lastTargetStatus = targetStatus;
    }
    if (!overIsColumn && overId !== activeId) {
      dragMetaRef.current.lastNonActiveOverId = overId;
    }

    const sourceTask = tasks.find((t) => String(t.id) === activeId);
    if (!sourceTask || !targetStatus) return;

    // Live same-column reordering animation.
    if (targetStatus === sourceTask.status && !overIsColumn && overId !== activeId) {
      setTasks((prev) => {
        const columnTasks = prev
          .filter((t) => t.status === sourceTask.status)
          .sort((a, b) => a.position - b.position);
        const oldIndex = columnTasks.findIndex((t) => String(t.id) === activeId);
        const newIndex = columnTasks.findIndex((t) => String(t.id) === overId);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;
        const reordered = arrayMove(columnTasks, oldIndex, newIndex).map((t, i) => ({
          ...t,
          position: i,
        }));
        return [...prev.filter((t) => t.status !== sourceTask.status), ...reordered];
      });
      return;
    }

    // Live cross-column animation: move the task into the target column while dragging.
    if (targetStatus === sourceTask.status) return;

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

      dragMetaRef.current.lastInsertIndex = insertIndex;

      const newTargetTasks = [
        ...targetColumnTasks.slice(0, insertIndex),
        movedTask,
        ...targetColumnTasks.slice(insertIndex),
      ].map((t, i) => ({ ...t, position: i }));

      const others = prev.filter(
        (t) => t.status !== sourceTask.status && t.status !== targetStatus
      );
      return [...others, ...sourceColumnTasks, ...newTargetTasks];
    });
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveTask(null);
    setSaving(true);

    try {
      if (!over) {
        // Drop outside any droppable area: restore pre-drag state.
        if (dragOriginTasks) setTasks(dragOriginTasks);
        dragMetaRef.current = { lastTargetStatus: null, lastNonActiveOverId: null, lastInsertIndex: null };
        setDragOriginTasks(null);
        return;
      }

      const activeId = String(active.id);
      const overId = String(over.id);

      const originalTask = dragOriginTasks?.find((t) => String(t.id) === activeId);
      if (!originalTask) {
        dragMetaRef.current = { lastTargetStatus: null, lastNonActiveOverId: null, lastInsertIndex: null };
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
        dragMetaRef.current = { lastTargetStatus: null, lastNonActiveOverId: null, lastInsertIndex: null };
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

        // Recompute final positions from the origin snapshot to avoid stale tasksRef.
        const originTargetColumn = dragOriginTasks
          .filter((t) => t.status === targetStatus)
          .sort((a, b) => a.position - b.position);

        const storedInsertIndex = dragMetaRef.current.lastInsertIndex;
        const insertIndex =
          storedInsertIndex != null ? storedInsertIndex : originTargetColumn.length;

        const movedTask = { ...originalTask, status: targetStatus };
        const finalColumnTasks = [
          ...originTargetColumn.slice(0, insertIndex),
          movedTask,
          ...originTargetColumn.slice(insertIndex),
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

        dragMetaRef.current = { lastTargetStatus: null, lastNonActiveOverId: null, lastInsertIndex: null };
        setDragOriginTasks(null);
        return;
      }

      // ── Same-column reorder ─────────────────────────────────────────────────
      // When live reordering has shifted card positions, the drop may land on the
      // column droppable (overIsColumn=true) rather than a task. Fall back to the
      // last recorded non-active hover target so the API call is never skipped.
      const sameColumnTargetId =
        !overIsColumn
          ? effectiveOverId
          : fallbackOverId ?? null;
      const sameColumnOverTask = sameColumnTargetId
        ? dragOriginTasks.find((t) => String(t.id) === sameColumnTargetId)
        : null;

      if (sameColumnOverTask) {
        const columnTasks = dragOriginTasks
          .filter((t) => t.status === originalTask.status)
          .sort((a, b) => a.position - b.position);

        const oldIndex = columnTasks.findIndex((t) => String(t.id) === activeId);
        const newIndex = columnTasks.findIndex((t) => String(t.id) === sameColumnTargetId);

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

      dragMetaRef.current = { lastTargetStatus: null, lastNonActiveOverId: null, lastInsertIndex: null };
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
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Kanban Board</h1>
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 shadow-sm transition-colors"
          aria-label="Search tasks"
        >
          🔍 Search
        </button>
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
