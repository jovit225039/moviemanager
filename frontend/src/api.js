const API_ROOT = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });

  const payload = await response.json().catch(() => ({
    success: false,
    message: "The server returned an unreadable response."
  }));

  if (!response.ok) {
    const error = new Error(payload.message || "Request failed.");
    error.status = response.status;
    throw error;
  }

  return payload;
}

export const api = {
  listMovies: (params) => {
    const query = new URLSearchParams(params);
    return request(`/movies?${query.toString()}`);
  },
  stats: () => request("/movies/stats"),
  nextMovie: () => request("/movies/next"),
  addMovie: (body) => request("/movies", { method: "POST", body: JSON.stringify(body) }),
  editMovie: (id, body) =>
    request(`/movies/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  changeStatus: (id, body) =>
    request(`/movies/${id}/status`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteMovie: (id) => request(`/movies/${id}`, { method: "DELETE" })
};
