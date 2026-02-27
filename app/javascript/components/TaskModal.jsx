import React, { useState, useEffect, useRef } from "react";
import { api } from "./api";

const STATUSES = ["todo", "in_progress", "done"];
const STATUS_LABELS = { todo: "Todo", in_progress: "In Progress", done: "Done" };

export default function TaskModal({ modal, onClose, onSave, onDelete }) {
  const { mode, task: initialTask, defaultStatus } = modal;

  const [title, setTitle] = useState(initialTask?.title ?? "");
  const [description, setDescription] = useState(initialTask?.description ?? "");
  const [status, setStatus] = useState(initialTask?.status ?? defaultStatus ?? "todo");
  const [comments, setComments] = useState(initialTask?.comments ?? []);
  const [newComment, setNewComment] = useState("");
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  const overlayRef = useRef(null);

  const formatDateTime = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Close on ESC
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const availableStatuses = STATUSES.filter((s) => {
    if (mode === "create") return s === "todo";
    const currentIdx = STATUSES.indexOf(initialTask?.status ?? "todo");
    return STATUSES.indexOf(s) >= currentIdx;
  });

  const handleSave = async () => {
    setSaving(true);
    setErrors([]);
    try {
      let response;
      if (mode === "create") {
        response = await api.post("/tasks.json", { task: { title, description, status: "todo" } });
      } else {
        response = await api.patch(`/tasks/${initialTask.id}.json`, { task: { title, description, status } });
      }
      const data = await response.json();
      if (!response.ok) {
        setErrors(data.errors ?? ["Something went wrong"]);
      } else {
        onSave(data, mode);
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Eliminare "${initialTask.title}"?`)) return;
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
    }
  };

  const handleDeleteComment = async (commentId) => {
    await api.delete(`/tasks/${initialTask.id}/comments/${commentId}.json`);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const isReadonly = false; // always allow editing

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            {mode === "create" ? "Nuovo Task" : "Task"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titolo *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titolo del task"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Descrizione opzionale"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {mode !== "create" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableStatuses.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Lo status può solo avanzare</p>
            </div>
          )}

          {mode !== "create" && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-600">Data creazione</span>
                <span className="font-medium text-gray-800">
                  {formatDateTime(initialTask?.created_at)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-gray-600">Ultimo aggiornamento</span>
                <span className="font-medium text-gray-800">
                  {formatDateTime(initialTask?.updated_at)}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              {saving ? "Salvataggio…" : mode === "create" ? "Crea Task" : "Salva"}
            </button>
            <button
              onClick={onClose}
              className="px-4 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annulla
            </button>
          </div>
        </div>

        {/* Comments section — only for existing tasks */}
        {mode !== "create" && (
          <div className="border-t border-gray-100 px-6 py-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">
              Commenti ({comments.length})
            </h3>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className="flex items-start justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-sm text-gray-700 flex-1">{c.body}</p>
                  <button
                    onClick={() => handleDeleteComment(c.id)}
                    className="text-gray-300 hover:text-red-500 text-xs shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-sm text-gray-400 italic">Nessun commento.</p>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                placeholder="Aggiungi commento…"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddComment}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-3 py-2 rounded-lg transition-colors"
              >
                Invia
              </button>
            </div>
          </div>
        )}

        {/* Delete button */}
        {mode !== "create" && (
          <div className="border-t border-gray-100 px-6 py-4">
            <button
              onClick={handleDelete}
              className="text-sm text-red-500 hover:text-red-700 hover:underline"
            >
              Elimina task
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
