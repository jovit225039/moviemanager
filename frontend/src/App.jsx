import React, { useEffect, useMemo, useState } from "react";
import {
  Film,
  Plus,
  Search,
  Sparkles,
  Clock3,
  Star,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X
} from "lucide-react";
import { api } from "./api";

const genres = ["Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Romance", "Thriller"];
const platforms = ["Netflix", "Prime Video", "Hotstar", "Theatre", "Other"];
const moves = {
  "To Watch": ["Watching", "Watched"],
  "Watching": ["Watched", "To Watch"],
  "Watched": []
};

const emptyForm = {
  title: "",
  genre: "Action",
  releaseYear: new Date().getFullYear(),
  runtime: 120,
  platform: "Netflix",
  priority: 3
};

function App() {
  const [movies, setMovies] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ search: "", status: "", genre: "", page: 1 });
  const [pages, setPages] = useState(1);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [nextPick, setNextPick] = useState(null);
  const [statusModal, setStatusModal] = useState(null);
  const [statusChoice, setStatusChoice] = useState("");
  const [statusRating, setStatusRating] = useState("");

  const yearNow = new Date().getFullYear();

  const loadEverything = async () => {
    try {
      const [movieResult, statResult] = await Promise.all([
        api.listMovies(filters),
        api.stats()
      ]);
      setMovies(movieResult.data.movies);
      setPages(movieResult.data.totalPages);
      setStats(statResult.data);
    } catch (error) {
      setNotice(error.message);
    }
  };

  useEffect(() => {
    loadEverything();
  }, [filters]);

  const openAdd = () => {
    setForm({ ...emptyForm, releaseYear: yearNow });
    setFormError("");
    setModal("add");
  };

  const openEdit = (movie) => {
    setForm({
      title: movie.title,
      genre: movie.genre,
      releaseYear: movie.releaseYear,
      runtime: movie.runtime,
      platform: movie.platform,
      priority: movie.priority
    });
    setFormError("");
    setModal(movie);
  };

  const submitMovie = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!form.title.trim()) return setFormError("Enter a movie title.");
    if (Number(form.releaseYear) < 1950 || Number(form.releaseYear) > yearNow) {
      return setFormError(`Release year must be between 1950 and ${yearNow}.`);
    }
    if (Number(form.runtime) < 30 || Number(form.runtime) > 300) {
      return setFormError("Runtime must be between 30 and 300 minutes.");
    }

    setBusy(true);
    try {
      if (modal === "add") {
        await api.addMovie({
          ...form,
          releaseYear: Number(form.releaseYear),
          runtime: Number(form.runtime),
          priority: Number(form.priority)
        });
        setNotice("Movie added to your plan.");
      } else {
        await api.editMovie(modal._id, {
          title: form.title,
          genre: form.genre,
          runtime: Number(form.runtime),
          platform: form.platform,
          priority: Number(form.priority)
        });
        setNotice("Movie details updated.");
      }
      setModal(null);
      await loadEverything();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setBusy(false);
    }
  };

  const openStatus = (movie) => {
    const options = moves[movie.status];
    if (!options.length) return;
    setStatusChoice(options[0]);
    setStatusRating("");
    setStatusModal(movie);
  };

  const saveStatus = async (event) => {
    event.preventDefault();
    if (!statusModal || !statusChoice) return;

    if (statusChoice === "Watched") {
      if (!/^(10|[1-9])$/.test(statusRating)) {
        setNotice("Rating must be a whole number from 1 to 10.");
        return;
      }
    }

    try {
      await api.changeStatus(statusModal._id, {
        status: statusChoice,
        ...(statusChoice === "Watched" ? { rating: Number(statusRating) } : {})
      });
      setStatusModal(null);
      setNotice(`${statusModal.title} is now ${statusChoice}.`);
      await loadEverything();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const editRating = async (movie) => {
    if (movie.status !== "Watched") return;
    const value = window.prompt("New rating (1–10):", movie.rating ?? "");
    if (value === null) return;
    if (!/^(10|[1-9])$/.test(value)) {
      setNotice("Rating must be a whole number from 1 to 10.");
      return;
    }

    try {
      await api.changeStatus(movie._id, { status: "Watched", rating: Number(value) });
      setNotice("Rating updated.");
      await loadEverything();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const removeMovie = async (movie) => {
    if (movie.status === "Watching") return;
    if (!window.confirm(`Delete "${movie.title}"?`)) return;

    try {
      await api.deleteMovie(movie._id);
      setNotice("Movie removed.");
      await loadEverything();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const pickNext = async () => {
    try {
      const result = await api.nextMovie();
      setNextPick(result.data);
    } catch (error) {
      setNotice(error.message);
      setNextPick(null);
    }
  };

  const changeFilter = (key, value) => {
    setFilters((old) => ({ ...old, [key]: value, page: 1 }));
  };

  const pageText = useMemo(() => `${filters.page} / ${pages}`, [filters.page, pages]);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><Film size={22} /></span>
          <div>
            <strong>ReelPlan</strong>
            <small>your watchlist, without the chaos</small>
          </div>
        </div>
        <button className="primary" onClick={openAdd}><Plus size={18} /> Add movie</button>
      </header>

      {notice && (
        <div className="toast">
          <span>{notice}</span>
          <button onClick={() => setNotice("")}><X size={16} /></button>
        </div>
      )}

      <section className="hero">
        <div>
          <p className="eyebrow">MOVIE WATCHLIST MANAGER</p>
          <h1>Know what to watch <em>next.</em></h1>
          <p className="hero-copy">Keep your queue tidy, track your watching journey, and let the backend choose your next priority pick.</p>
          <button className="magic" onClick={pickNext}><Sparkles size={18} /> What should I watch next?</button>
        </div>
        <div className="film-orbit"><Film size={88} strokeWidth={1.1} /></div>
      </section>

      {nextPick && (
        <section className="next-pick">
          <div>
            <span className="eyebrow">TONIGHT'S PICK</span>
            <h2>{nextPick.title}</h2>
            <p>{nextPick.genre} · {nextPick.runtime} min · priority {nextPick.priority}/5</p>
          </div>
          <button onClick={() => setNextPick(null)}><X size={18} /></button>
        </section>
      )}

      {stats && (
        <section className="stats-grid">
          <Stat label="To Watch" value={stats.statusCounts["To Watch"]} />
          <Stat label="Watching" value={stats.statusCounts.Watching} />
          <Stat label="Watched" value={stats.statusCounts.Watched} />
          <Stat label="Hours watched" value={stats.totalHoursWatched} />
          <Stat label="Avg. rating" value={stats.averageRating ?? "—"} icon={<Star size={15} />} />
          <Stat label="Top genre" value={stats.topWatchedGenre ?? "—"} />
        </section>
      )}

      <section className="toolbar">
        <div className="search-box">
          <Search size={18} />
          <input
            value={filters.search}
            onChange={(e) => changeFilter("search", e.target.value)}
            placeholder="Search movie title..."
          />
        </div>
        <select value={filters.status} onChange={(e) => changeFilter("status", e.target.value)}>
          <option value="">All statuses</option>
          <option>To Watch</option>
          <option>Watching</option>
          <option>Watched</option>
        </select>
        <select value={filters.genre} onChange={(e) => changeFilter("genre", e.target.value)}>
          <option value="">All genres</option>
          {genres.map((genre) => <option key={genre}>{genre}</option>)}
        </select>
        <button className="ghost" onClick={loadEverything}><RefreshCw size={17} /></button>
      </section>

      <section className="movie-grid">
        {movies.map((movie) => (
          <article className="movie-card" key={movie._id}>
            <div className="card-top">
              <span className={`status ${movie.status.toLowerCase().replaceAll(" ", "-")}`}>{movie.status}</span>
              <span className="code">{movie.movieCode}</span>
            </div>
            <h3>{movie.title}</h3>
            <p className="meta">{movie.genre} · {movie.releaseYear} · {movie.platform}</p>
            <div className="details">
              <span><Clock3 size={15} /> {movie.runtime} min</span>
              <span>Priority <b>{movie.priority}/5</b></span>
              {movie.rating && (
                <button className="rating" onClick={() => editRating(movie)}>
                  <Star size={14} fill="currentColor" /> {movie.rating}/10
                </button>
              )}
            </div>
            <div className="card-actions">
              {moves[movie.status].length > 0 ? (
                <button className="action" onClick={() => openStatus(movie)}>Update status</button>
              ) : (
                <span className="final-label">✓ Complete</span>
              )}
              <button className="icon-button" title="Edit" onClick={() => openEdit(movie)}><Pencil size={16} /></button>
              <button
                className="icon-button danger"
                title={movie.status === "Watching" ? "Watching movies cannot be deleted" : "Delete"}
                disabled={movie.status === "Watching"}
                onClick={() => removeMovie(movie)}
              ><Trash2 size={16} /></button>
            </div>
          </article>
        ))}
      </section>

      {!movies.length && <div className="empty">No movies match your current filters.</div>}

      <footer className="pagination">
        <button disabled={filters.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}><ChevronLeft size={18} /></button>
        <span>Page {pageText}</span>
        <button disabled={filters.page >= pages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}><ChevronRight size={18} /></button>
      </footer>


      {statusModal && (
        <div className="backdrop" onMouseDown={() => setStatusModal(null)}>
          <form className="modal compact-modal" onSubmit={saveStatus} onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">STATUS WORKFLOW</span>
                <h2>Move this movie</h2>
              </div>
              <button type="button" className="icon-button" onClick={() => setStatusModal(null)}><X /></button>
            </div>
            <p className="modal-note">{statusModal.title} · currently {statusModal.status}</p>
            <label>
              Next status
              <select value={statusChoice} onChange={(e) => setStatusChoice(e.target.value)}>
                {moves[statusModal.status].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            {statusChoice === "Watched" && (
              <label>
                Rating (1–10)
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={statusRating}
                  onChange={(e) => setStatusRating(e.target.value)}
                  placeholder="Required"
                />
              </label>
            )}
            <button className="primary wide">Save status</button>
          </form>
        </div>
      )}

      {modal && (
        <div className="backdrop" onMouseDown={() => setModal(null)}>
          <form className="modal" onSubmit={submitMovie} onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">{modal === "add" ? "NEW ENTRY" : "EDIT ENTRY"}</span>
                <h2>{modal === "add" ? "Add a movie" : "Edit movie"}</h2>
              </div>
              <button type="button" className="icon-button" onClick={() => setModal(null)}><X /></button>
            </div>

            <label>Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
            <div className="form-row">
              <label>Genre<select value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })}>{genres.map((x) => <option key={x}>{x}</option>)}</select></label>
              <label>Release year<input type="number" disabled={modal !== "add"} min="1950" max={yearNow} value={form.releaseYear} onChange={(e) => setForm({ ...form, releaseYear: e.target.value })} /></label>
            </div>
            <div className="form-row">
              <label>Runtime (minutes)<input type="number" min="30" max="300" value={form.runtime} onChange={(e) => setForm({ ...form, runtime: e.target.value })} /></label>
              <label>Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{[1,2,3,4,5].map((x) => <option key={x} value={x}>{x} / 5</option>)}</select></label>
            </div>
            <label>Platform<select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>{platforms.map((x) => <option key={x}>{x}</option>)}</select></label>

            {formError && <p className="form-error">{formError}</p>}
            <button className="primary wide" disabled={busy}>{busy ? "Saving..." : modal === "add" ? "Create movie" : "Save changes"}</button>
          </form>
        </div>
      )}
    </main>
  );
}

function Stat({ label, value, icon }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{icon}{value}</strong>
    </div>
  );
}

export default App;
