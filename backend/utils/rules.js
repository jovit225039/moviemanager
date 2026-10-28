export const GENRES = [
  "Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Romance", "Thriller"
];

export const PLATFORMS = [
  "Netflix", "Prime Video", "Hotstar", "Theatre", "Other"
];

export const STATUSES = ["To Watch", "Watching", "Watched"];

export const validMoves = {
  "To Watch": ["Watching", "Watched"],
  "Watching": ["Watched", "To Watch"],
  "Watched": []
};

export function checkMovieFields(input) {
  const currentYear = new Date().getFullYear();
  const { title, genre, releaseYear, runtime, platform, priority } = input;

  if (!title || !String(title).trim()) return "Title is required.";
  if (!GENRES.includes(genre)) return "Choose a valid genre.";
  if (!Number.isInteger(Number(releaseYear)) ||
      Number(releaseYear) < 1950 ||
      Number(releaseYear) > currentYear) {
    return `Release year must be between 1950 and ${currentYear}.`;
  }
  if (!Number.isInteger(Number(runtime)) ||
      Number(runtime) < 30 ||
      Number(runtime) > 300) {
    return "Runtime must be between 30 and 300 minutes.";
  }
  if (!PLATFORMS.includes(platform)) return "Choose a valid platform.";
  if (!Number.isInteger(Number(priority)) ||
      Number(priority) < 1 || Number(priority) > 5) {
    return "Priority must be between 1 and 5.";
  }
  return null;
}
