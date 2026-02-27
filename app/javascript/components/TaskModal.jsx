import React, { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { useT } from "./i18n";

const STATUSES = ["todo", "in_progress", "done"];

export default function TaskModal({ modal, onClose, onSave, onDelete }) {
  const t = useT();
  const { mode, task: initialTask, defaultStatus } = modal;

  const initialTitle = initialTask?.title ?? "";
  const initialDescription = initialTask?.description ?? "";
  const initialStatus = initialTask?.status ?? defaultStatus ?? "todo";

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [status, setStatus] = useState(initialStatus);
  const [comments, setComments] = useState(initialTask?.comments ?? []);
  const [pendingDeleteCommentId, setPendingDeleteCommentId] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  const overlayRef = useRef(null);
  const dateLocale = t("locale", { defaultValue: "en-US" });

  const formatDateTime = (value) => {
    if (!value) return t("task_modal.invalid_date");

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return t("task_modal.invalid_date");
    }

    return new Intl.DateTimeFormat(dateLocale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const availableStatuses = STATUSES.filter((nextStatus) => {
    if (mode === "create") return nextStatus === "todo";

    const currentIdx = STATUSES.indexOf(initialTask?.status ?? "todo");
    return STATUSES.indexOf(nextStatus) >= currentIdx;
  });

  const hasPendingChanges =
    mode === "create"
      ? title !== initialTitle || description !== initialDescription
      : title !== initialTitle ||
        description !== initialDescription ||
        status !== initialStatus;
  const isSaveDisabled = saving || !hasPendingChanges;
  const requestClose = useCallback(() => {
    if (hasPendingChanges) {
      const confirmed = confirm(t("task_modal.confirm_close_unsaved"));
      if (!confirmed) return;
    }

    onClose();
  }, [hasPendingChanges, onClose, t]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") requestClose();
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [requestClose]);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) requestClose();
  };

  const handleSave = async () => {
    setSaving(true);
    setErrors([]);

    try {
      let response;
      if (mode === "create") {
        response = await api.post("/tasks.json", {
          task: { title, description, status: "todo" },
        });
      } else {
        response = await api.patch(`/tasks/${initialTask.id}.json`, {
          task: { title, description, status },
        });
      }

      const data = await response.json();
      if (!response.ok) {
        setErrors(data.errors ?? [t("task_modal.generic_error")]);
        return;
      }

      onSave(data, mode);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = confirm(
      t("task_modal.confirm_delete", {
        title: initialTask.title,
      })
    );
    if (!confirmed) return;

    await api.delete(`/tasks/${initialTask.id}.json`);
    onDelete(initialTask.id);
    onClose();
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    const response = await api.post(`/tasks/${initialTask.id}/comments.json`, {
      comment: { body: newComment },
    });

    if (response.ok) {
      const comment = await response.json();
      setComments((prev) => [...prev, comment]);
      setNewComment("");
      setPendingDeleteCommentId(null);
    }
  };

  const handleDeleteComment = async (commentId) => {
    await api.delete(`/tasks/${initialTask.id}/comments/${commentId}.json`);
    setComments((prev) => prev.filter((comment) => comment.id !== commentId));
    setPendingDeleteCommentId(null);
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            {mode === "create"
              ? t("task_modal.new_task_title")
              : t("task_modal.task_title")}
          </h2>
          <button
            onClick={requestClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label={t("task_modal.close_aria")}
          >
            ×
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {errors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("task_modal.title_label")}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("task_modal.title_placeholder")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("task_modal.description_label")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={t("task_modal.description_placeholder")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {mode !== "create" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("task_modal.status_label")}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableStatuses.map((nextStatus) => (
                  <option key={nextStatus} value={nextStatus}>
                    {t(`statuses.${nextStatus}`)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {t("task_modal.status_forward_hint")}
              </p>
            </div>
          )}

          {mode !== "create" && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-600">
                  {t("task_modal.created_at_label")}
                </span>
                <span className="font-medium text-gray-800">
                  {formatDateTime(initialTask?.created_at)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-gray-600">
                  {t("task_modal.updated_at_label")}
                </span>
                <span className="font-medium text-gray-800">
                  {formatDateTime(initialTask?.updated_at)}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={isSaveDisabled}
              className={`flex-1 bg-blue-600 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50 ${isSaveDisabled ? "" : "hover:bg-blue-700"}`}
            >
              {saving
                ? t("task_modal.saving")
                : mode === "create"
                  ? t("task_modal.create")
                  : t("task_modal.save")}
            </button>
          </div>
        </div>

        {mode !== "create" && (
          <div className="border-t border-gray-100 px-6 py-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">
              {t("task_modal.comments_heading", {
                count: comments.length,
              })}
            </h3>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment.id} className="flex">
                  <div
                    className="w-full rounded-2xl rounded-bl-md border border-blue-100 bg-blue-50 px-3 py-2"
                    onMouseLeave={() => {
                      if (pendingDeleteCommentId === comment.id) {
                        setPendingDeleteCommentId(null);
                      }
                    }}
                  >
                    <p className="text-sm text-gray-700">{comment.body}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-500">
                        {formatDateTime(comment.created_at)}
                      </span>
                      <div className="relative h-6 w-20 shrink-0">
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className={`absolute inset-0 rounded bg-red-500 px-2 py-0.5 text-xs text-white hover:bg-red-600 transition-opacity ${
                            pendingDeleteCommentId === comment.id
                              ? "opacity-100 pointer-events-auto"
                              : "opacity-0 pointer-events-none"
                          }`}
                        >
                          {t("task_modal.confirm_comment_delete")}
                        </button>
                        <button
                          onClick={() => setPendingDeleteCommentId(comment.id)}
                          className={`absolute right-0 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500 text-xs transition-opacity ${
                            pendingDeleteCommentId === comment.id
                              ? "opacity-0 pointer-events-none"
                              : "opacity-100 pointer-events-auto"
                          }`}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-sm text-gray-400 italic">
                  {t("task_modal.no_comments")}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                placeholder={t("task_modal.add_comment_placeholder")}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddComment}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-3 py-2 rounded-lg transition-colors"
              >
                {t("task_modal.send_comment")}
              </button>
            </div>
          </div>
        )}

        {mode !== "create" && (
          <div className="border-t border-gray-100 px-6 py-4">
            <button
              onClick={handleDelete}
              className="text-sm text-red-500 hover:text-red-700 hover:underline"
            >
              {t("task_modal.delete_task")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
