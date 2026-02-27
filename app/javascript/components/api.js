const csrfToken = () =>
  document.querySelector('meta[name="csrf-token"]')?.content;

export const api = {
  get: (url) =>
    fetch(url, { headers: { Accept: "application/json" } }),

  post: (url, body) =>
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken(),
      },
      body: JSON.stringify(body),
    }),

  patch: (url, body) =>
    fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken(),
      },
      body: JSON.stringify(body),
    }),

  delete: (url) =>
    fetch(url, {
      method: "DELETE",
      headers: { "X-CSRF-Token": csrfToken() },
    }),
};
