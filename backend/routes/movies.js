import express from "express";
import Movie from "../models/Movie.js";
import YearCounter from "../models/YearCounter.js";
import { fail, ok } from "../utils/replies.js";
import { checkMovieFields, validMoves } from "../utils/rules.js";

const router = express.Router();

async function nextMovieCode(year) {
  const counter = await YearCounter.findOneAndUpdate(
    { _id: year },
    { $inc: { value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return `MV-${year}-${String(counter.value).padStart(3, "0")}`;
}

router.post("/", async (req, res, next) => {
  try {
    const error = checkMovieFields(req.body);
    if (error) return fail(res, error, 400);

    const title = String(req.body.title).trim();
    const titleKey = title.toLowerCase();
    const releaseYear = Number(req.body.releaseYear);

    const duplicate = await Movie.exists({ titleKey, releaseYear });
    if (duplicate) {
      return fail(res, "A movie with this title and release year already exists.", 409);
    }

    const movieCode = await nextMovieCode(releaseYear);

    const movie = await Movie.create({
      movieCode,
      title,
      titleKey,
      genre: req.body.genre,
      releaseYear,
      runtime: Number(req.body.runtime),
      platform: req.body.platform,
      priority: Number(req.body.priority),
      status: "To Watch",
      rating: null,
      watchedDate: null
    });

    return ok(res, movie, "Movie added.", 201);
  } catch (error) {
    if (error?.code === 11000) {
      return fail(res, "A movie with this title and release year already exists.", 409);
    }
    next(error);
  }
});

router.get("/next", async (req, res, next) => {
  try {
    const movie = await Movie.findOne({ status: "To Watch" })
      .sort({ priority: -1, runtime: 1, createdAt: 1 });

    if (!movie) return fail(res, "There are no movies waiting to be watched.", 404);
    return ok(res, movie, "Your next pick is ready.");
  } catch (error) {
    next(error);
  }
});

router.get("/stats", async (req, res, next) => {
  try {
    const statusRows = await Movie.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const watchedRows = await Movie.aggregate([
      { $match: { status: "Watched" } },
      {
        $group: {
          _id: null,
          totalRuntime: { $sum: "$runtime" },
          averageRating: { $avg: "$rating" },
          watchedCount: { $sum: 1 }
        }
      }
    ]);

    const genreRows = await Movie.aggregate([
      { $match: { status: "Watched" } },
      { $group: { _id: "$genre", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 1 }
    ]);

    const statusCounts = {
      "To Watch": 0,
      "Watching": 0,
      "Watched": 0
    };

    statusRows.forEach((row) => {
      statusCounts[row._id] = row.count;
    });

    const watched = watchedRows[0] || {
      totalRuntime: 0,
      averageRating: null,
      watchedCount: 0
    };

    return ok(res, {
      statusCounts,
      totalHoursWatched: Number((watched.totalRuntime / 60).toFixed(1)),
      averageRating: watched.averageRating == null
        ? null
        : Number(watched.averageRating.toFixed(1)),
      topWatchedGenre: genreRows[0]?. _id || null
    }, "Statistics loaded.");
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const pageSize = 6;
    const filter = {};

    if (req.query.status) filter.status = req.query.status;
    if (req.query.genre) filter.genre = req.query.genre;

    if (req.query.search?.trim()) {
      filter.title = { $regex: req.query.search.trim(), $options: "i" };
    }

    const totalMovies = await Movie.countDocuments(filter);
    const totalPages = Math.max(Math.ceil(totalMovies / pageSize), 1);

    const movies = await Movie.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    return ok(res, {
      movies,
      page,
      pageSize,
      totalMovies,
      totalPages
    }, "Movies loaded.");
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return fail(res, "Movie not found.", 404);
    return ok(res, movie, "Movie loaded.");
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return fail(res, "Movie not found.", 404);

    const merged = {
      title: req.body.title ?? movie.title,
      genre: req.body.genre ?? movie.genre,
      releaseYear: movie.releaseYear,
      runtime: req.body.runtime ?? movie.runtime,
      platform: req.body.platform ?? movie.platform,
      priority: req.body.priority ?? movie.priority
    };

    const error = checkMovieFields(merged);
    if (error) return fail(res, error, 400);

    const title = String(merged.title).trim();
    const titleKey = title.toLowerCase();

    const duplicate = await Movie.findOne({
      _id: { $ne: movie._id },
      titleKey,
      releaseYear: movie.releaseYear
    });

    if (duplicate) {
      return fail(res, "A movie with this title and release year already exists.", 409);
    }

    movie.title = title;
    movie.titleKey = titleKey;
    movie.genre = merged.genre;
    movie.runtime = Number(merged.runtime);
    movie.platform = merged.platform;
    movie.priority = Number(merged.priority);

    await movie.save();
    return ok(res, movie, "Movie updated.");
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return fail(res, "Movie not found.", 404);

    const nextStatus = req.body.status;
    const suppliedRating = req.body.rating;
    const ratingEdit = movie.status === "Watched" && nextStatus === "Watched";

    if (!ratingEdit) {
      const allowed = validMoves[movie.status] || [];
      if (!allowed.includes(nextStatus)) {
        return fail(
          res,
          movie.status === "Watched"
            ? "Watched movies are final and cannot change status."
            : `Invalid status transition from ${movie.status} to ${nextStatus}.`,
          400
        );
      }
    }

    if (nextStatus === "Watched") {
      if (suppliedRating === undefined || suppliedRating === null || suppliedRating === "") {
        return fail(res, "A rating from 1 to 10 is required when marking a movie Watched.", 400);
      }

      const rating = Number(suppliedRating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
        return fail(res, "Rating must be a whole number from 1 to 10.", 400);
      }

      movie.rating = rating;
      movie.watchedDate = new Date();
    } else if (suppliedRating !== undefined) {
      return fail(res, "A rating can only be stored for a Watched movie.", 400);
    }

    movie.status = nextStatus;
    await movie.save();

    return ok(res, movie, "Status updated.");
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return fail(res, "Movie not found.", 404);

    if (movie.status === "Watching") {
      return fail(res, "Watching movies cannot be deleted.", 400);
    }

    await movie.deleteOne();
    return ok(res, null, "Movie deleted.");
  } catch (error) {
    next(error);
  }
});

export default router;
