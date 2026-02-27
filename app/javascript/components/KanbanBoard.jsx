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
import { useT } from "./i18n";

const STATUSES = ["todo", "in_progress", "done"];

export default function KanbanBoard({ initialTasks = [] }) {
  const t = useT();
  const [tasks, setTasks] = useState(initialTasks);
  const [modal, setModal] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [dragOriginTasks, setDragOriginTasks] = useState(null);
  const [saving, setSaving] = useState(false);

  const pendingReorderRef = useRef(null);
  const lastTargetStatusRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = ({ active }) => {
    const task = tasks.find((item) => String(item.id) === active.id);
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
    const overTask = !overIsColumn ? tasks.find((item) => String(item.id) === overId) : null;
    const targetStatus =
      (overIsColumn && overId) ||
      (STATUSES.includes(overContainerId) ? overContainerId : null) ||
      overTask?.status;

    if (!targetStatus) return;
    lastTargetStatusRef.current = targetStatus;

    const sourceTask = tasks.find((item) => String(item.id) === activeId);
    if (!sourceTask) return;

    if (targetStatus === sourceTask.status) {
      if (!overIsColumn && overId !== activeId) {
        const columnTasks = tasks
          .filter((item) => item.status === targetStatus)
          .sort((a, b) => a.position - b.position);
        const oldIdx = columnTasks.findIndex((item) => String(item.id) === activeId);
        const newIdx = columnTasks.findIndex((item) => String(item.id) === overId);
        if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
          pendingReorderRef.current = {
            targetStatus,
            orderedIds: arrayMove(columnTasks, oldIdx, newIdx).map((item) => String(item.id)),
          };
        }
      } else if (!overIsColumn && overId === activeId) {
        const originalTask = dragOriginTasks?.find((item) => String(item.id) === activeId);
        if (!originalTask || originalTask.status === targetStatus) {
          pendingReorderRef.current = null;
        }
      }
      return;
    }

    setTasks((prev) => {
      const sourceColumnTasks = prev
        .filter((item) => item.status === sourceTask.status && String(item.id) !== activeId)
        .sort((a, b) => a.position - b.position)
        .map((item, index) => ({ ...item, position: index }));

      const targetColumnTasks = prev
        .filter((item) => item.status === targetStatus)
        .sort((a, b) => a.position - b.position);

      const movedTask = { ...sourceTask, status: targetStatus };

      let insertIndex;
      if (overTask && overId !== activeId) {
        insertIndex = targetColumnTasks.findIndex((item) => String(item.id) === overId);
        if (insertIndex === -1) insertIndex = targetColumnTasks.length;
      } else {
        insertIndex = targetColumnTasks.length;
      }

      const newTargetTasks = [
        ...targetColumnTasks.slice(0, insertIndex),
        movedTask,
        ...targetColumnTasks.slice(insertIndex),
      ].map((item, index) => ({ ...item, position: index }));

      pendingReorderRef.current = {
        targetStatus,
        orderedIds: newTargetTasks.map((item) => String(item.id)),
      };

      const others = prev.filter(
        (item) => item.status !== sourceTask.status && item.status !== targetStatus
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

      const originalTask = dragOriginTasks?.find((item) => String(item.id) === activeId);
      if (!originalTask) {
        cleanup();
        return;
      }

      const overContainerId = over?.data?.current?.sortable?.containerId;
      const overOriginalTask = !overIsColumn
        ? dragOriginTasks.find((item) => String(item.id) === overId)
        : null;

      const targetStatus =
        (overIsColumn && overId) ||
        (STATUSES.includes(overContainerId) ? overContainerId : null) ||
        overOriginalTask?.status ||
        pendingReorderRef.current?.targetStatus ||
        lastTargetStatusRef.current;

      if (!targetStatus) {
        cleanup();
        return;
      }

      const isCrossColumn = targetStatus !== originalTask.status;

      if (isCrossColumn) {
        const oldStatusIndex = STATUSES.indexOf(originalTask.status);
        const newStatusIndex = STATUSES.indexOf(targetStatus);

        if (newStatusIndex < oldStatusIndex) {
          setTasks(dragOriginTasks);
          cleanup();
          alert(t("kanban.status_forward_only"));
          return;
        }

        const originTargetColumn = dragOriginTasks
          .filter((item) => item.status === targetStatus)
          .sort((a, b) => a.position - b.position);

        let finalColumnTasks;
        if (pendingReorderRef.current?.targetStatus === targetStatus) {
          const taskById = new Map(dragOriginTasks.map((item) => [String(item.id), item]));
          taskById.set(activeId, { ...originalTask, status: targetStatus });
          finalColumnTasks = pendingReorderRef.current.orderedIds
            .map((id) => taskById.get(id))
            .filter(Boolean)
            .map((item, index) => ({ ...item, position: index }));
        } else {
          finalColumnTasks = [...originTargetColumn, { ...originalTask, status: targetStatus }].map(
            (item, index) => ({ ...item, position: index })
          );
        }

        setTasks((prev) => [
          ...prev.filter((item) => item.status !== targetStatus && String(item.id) !== activeId),
          ...finalColumnTasks,
        ]);

        const taskId = Number(activeId);
        const statusResponse = await api.patch(`/tasks/${taskId}.json`, {
          task: { status: targetStatus },
        });

        if (!statusResponse.ok) {
          setTasks(dragOriginTasks);
          const data = await statusResponse.json().catch(() => ({}));
          alert(
            data.errors?.join(", ") ||
              t("kanban.status_update_failed")
          );
          cleanup();
          return;
        }

        const reorderBody = finalColumnTasks.map((item) => ({
          id: item.id,
          position: item.position,
        }));
        await api.post("/tasks/reorder.json", { tasks: reorderBody });

        cleanup();
        return;
      }

      if (!overIsColumn && overId === activeId) {
        cleanup();
        return;
      }

      if (pendingReorderRef.current?.targetStatus === originalTask.status) {
        const taskById = new Map(dragOriginTasks.map((item) => [String(item.id), item]));
        const reordered = pendingReorderRef.current.orderedIds
          .map((id) => taskById.get(id))
          .filter(Boolean)
          .map((item, index) => ({ ...item, position: index }));

        setTasks((prev) => [
          ...prev.filter((item) => item.status !== originalTask.status),
          ...reordered,
        ]);

        const body = reordered.map((item) => ({ id: item.id, position: item.position }));
        const response = await api.post("/tasks/reorder.json", { tasks: body });
        if (!response.ok) setTasks(dragOriginTasks);
      }

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
      return;
    }

    setTasks((prev) => prev.map((task) => (task.id === savedTask.id ? savedTask : task)));
  };

  const handleDelete = (taskId) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
      data-saving={saving}
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">
            {t("kanban.board_title")}
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={openCreateModal}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors"
              aria-label={t("kanban.add_task_aria")}
            >
              {t("kanban.add_task")}
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 shadow-sm transition-colors"
              aria-label={t("kanban.search_tasks_aria")}
            >
              🔍 {t("kanban.search")}
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
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:gap-6">
            {STATUSES.map((status) => (
              <Column
                key={status}
                status={status}
                tasks={tasks
                  .filter((task) => task.status === status)
                  .sort((a, b) => a.position - b.position)}
                onCardClick={openEditModal}
              />
            ))}
          </div>

          <DragOverlay>{activeTask ? <TaskCard task={activeTask} onClick={() => {}} /> : null}</DragOverlay>
        </DndContext>
      </div>

      {searchOpen && (
        <SearchModal
          tasks={tasks}
          onClose={() => setSearchOpen(false)}
          onSelectTask={(task) => {
            setSearchOpen(false);
            openEditModal(task);
          }}
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
