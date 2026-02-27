import React, { useEffect, useRef, useState } from "react";
import { useT } from "./i18n";

const STATUS_BADGE_CLASSES = {
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
};

export default function SearchModal({ tasks, onClose, onSelectTask }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const inputRef = useRef(null);

  const chips = [
    {
      value: "all",
      label: t("search_modal.chips.all"),
      classes: "bg-gray-200 text-gray-700 hover:bg-gray-300",
    },
    {
      value: "todo",
      label: t("search_modal.chips.todo"),
      classes: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    },
    {
      value: "in_progress",
      label: t("search_modal.chips.in_progress"),
      classes: "bg-blue-100 text-blue-700 hover:bg-blue-200",
    },
    {
      value: "done",
      label: t("search_modal.chips.done"),
      classes: "bg-green-100 text-green-700 hover:bg-green-200",
    },
  ];

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const results = tasks.filter((task) => {
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesQuery = task.title.toLowerCase().includes(query.toLowerCase().trim());
    return matchesStatus && matchesQuery;
  });

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-semibold text-gray-800">
            {t("search_modal.title")}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label={t("search_modal.close_aria")}
          >
            ×
          </button>
        </div>

        <div className="px-5 pb-3 flex flex-col gap-3">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search_modal.query_placeholder")}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <div className="flex gap-2 flex-wrap">
            {chips.map((chip) => (
              <button
                key={chip.value}
                onClick={() => setStatusFilter(chip.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${chip.classes} ${
                  statusFilter === chip.value ? "ring-2 ring-offset-1 ring-blue-400" : ""
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        <hr className="border-gray-200" />

        <div className="overflow-y-auto max-h-80 px-3 py-2">
          {results.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">
              {t("search_modal.empty_state")}
            </p>
          ) : (
            results.map((task) => (
              <button
                key={task.id}
                onClick={() => onSelectTask(task)}
                className="w-full text-left flex items-center justify-between px-3 py-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <span className="font-medium text-gray-800 text-sm truncate mr-3">{task.title}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE_CLASSES[task.status]}`}
                  >
                    {t(`statuses.${task.status}`)}
                  </span>
                  {task.comments_count > 0 && <span className="text-xs text-gray-400">💬 {task.comments_count}</span>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
