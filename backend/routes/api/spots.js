const express = require("express");
const router = express.Router();
const {
  Spot,
  Review,
  SpotImage,
  sequelize,
  User,
  Booking,
  ReviewImage,
} = require("../../db/models");
const { Op } = require("sequelize");
const { requireAuth } = require("../../utils/auth");
const { check, validationResult } = require("express-validator");

// GET /api/spots
router.get("/", async (req, res) => {
  let {
    page = 1,
    size = 20,
    minLat,
    maxLat,
    minLng,
    maxLng,
    minPrice,
    maxPrice,
  } = req.query;

  // Convert query parameters to appropriate types
  page = parseInt(page);
  size = parseInt(size);

  const errors = {};

  // Validate 'page'
  if (isNaN(page) || page < 1) {
    errors.page = "Page must be greater than or equal to 1";
  }

  // Validate 'size'
  if (isNaN(size) || size < 1 || size > 20) {
    errors.size = "Size must be between 1 and 20";
  }

  // Validate 'minLat' and 'maxLat'
  if (minLat !== undefined) {
    minLat = parseFloat(minLat);
    if (isNaN(minLat)) {
      errors.minLat = "Minimum latitude is invalid";
    }
  }

  if (maxLat !== undefined) {
    maxLat = parseFloat(maxLat);
    if (isNaN(maxLat)) {
      errors.maxLat = "Maximum latitude is invalid";
    }
  }

  // Validate 'minLng' and 'maxLng'
  if (minLng !== undefined) {
    minLng = parseFloat(minLng);
    if (isNaN(minLng)) {
      errors.minLng = "Minimum longitude is invalid";
    }
  }

  if (maxLng !== undefined) {
    maxLng = parseFloat(maxLng);
    if (isNaN(maxLng)) {
      errors.maxLng = "Maximum longitude is invalid";
    }
  }

  // Validate 'minPrice' and 'maxPrice'
  if (minPrice !== undefined) {
    minPrice = parseFloat(minPrice);
    if (isNaN(minPrice) || minPrice < 0) {
      errors.minPrice = "Minimum price must be greater than or equal to 0";
    }
  }

  if (maxPrice !== undefined) {
    maxPrice = parseFloat(maxPrice);
    if (isNaN(maxPrice) || maxPrice < 0) {
      errors.maxPrice = "Maximum price must be greater than or equal to 0";
    }
  }

  // If there are validation errors, return a 400 response
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      message: "Bad Request",
      errors,
    });
  }

  // Build the 'where' clause for Sequelize
  const where = {};

  if (minLat !== undefined) {
    where.lat = { [Op.gte]: minLat };
  }

  if (maxLat !== undefined) {
    where.lat = { ...where.lat, [Op.lte]: maxLat };
  }

  if (minLng !== undefined) {
    where.lng = { [Op.gte]: minLng };
  }

  if (maxLng !== undefined) {
    where.lng = { ...where.lng, [Op.lte]: maxLng };
  }

  if (minPrice !== undefined) {
    where.price = { [Op.gte]: minPrice };
  }

  if (maxPrice !== undefined) {
    where.price = { ...where.price, [Op.lte]: maxPrice };
  }

  // Set limit and offset for pagination
  const limit = size;
  const offset = (page - 1) * size;

  const reviewTable = Review.getTableName({ schema: true });
  const spotImageTable = SpotImage.getTableName({ schema: true });

  // Query spots with filters and pagination
  try {
    const spots = await Spot.findAll({
      where,
      limit,
      offset,
      attributes: {
        include: [
          // Calculate average rating using a subquery
          [
            sequelize.literal(`(
              SELECT ROUND(AVG("Reviews"."stars"), 1)
              FROM ${reviewTable} AS "Reviews"
              WHERE "Reviews"."spotId" = "Spot"."id"
            )`),
            "avgRating",
          ],
          // Include previewImage using a subquery
          [
            sequelize.literal(`(
              SELECT "url"
              FROM "SpotImages"
              WHERE "SpotImages"."spotId" = "Spot"."id" AND "SpotImages"."preview" = true
              LIMIT 1
            )`),
            "previewImage",
          ],
        ],
      },
      logging: console.log, // Add this line to log the query
    });

    // Format the response data
    const Spots = spots.map((spot) => {
      return {
        id: spot.id,
        ownerId: spot.ownerId,
        address: spot.address,
        city: spot.city,
        state: spot.state,
        country: spot.country,
        lat: parseFloat(spot.lat),
        lng: parseFloat(spot.lng),
        name: spot.name,
        description: spot.description,
        price: parseInt(spot.price),
        createdAt: spot.createdAt,
        updatedAt: spot.updatedAt,
        avgRating: spot.dataValues.avgRating
          ? parseFloat(spot.dataValues.avgRating)
          : null,
        previewImage: spot.dataValues.previewImage || null,
      };
    });
    console.log(req.query);

    // Return the response
    return res.json({
      Spots,
      page,
      size,
    });
  } catch (error) {
    // Log the error for debugging
    console.error("Error fetching spots:", error);

    // Return a 500 Internal Server Error with a generic message
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

// Get all Spots owned by the Current User
router.get("/current", requireAuth, async (req, res) => {
  try {
    const Spots = await Spot.findAll({
      where: { ownerId: req.user.id },
      include: [
        {
          model: SpotImage,
          where: { preview: true },
          required: false,
          attributes: ["url"],
        },
        {
          model: Review,
          attributes: [],
        },
      ],
      attributes: {
        include: [
          [sequelize.fn("AVG", sequelize.col("Reviews.stars")), "avgRating"],
        ],
      },
      group: ["Spot.id", "SpotImages.id"],
    });

    const formattedSpots = Spots.map((spot) => ({
      ...spot.toJSON(),
      previewImage: spot.SpotImages[0]?.url || null,
      avgRating: Number(spot.dataValues.avgRating).toFixed(1),
    }));

    return res.json({ Spots: formattedSpots });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/:spotId/images", requireAuth, async (req, res) => {
  const { spotId } = req.params;
  const { url, preview } = req.body;
  const userId = req.user?.id;

  // Check if user is logged in
  if (!userId) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  // Find the spot
  const spot = await Spot.findByPk(spotId);

  if (!spot) {
    return res.status(404).json({
      message: "Spot couldn't be found",
    });
  }

  // Check if the current user is the owner of the spot
  if (spot.ownerId !== userId) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  // Create the image
  const newImage = await SpotImage.create({
    spotId,
    url,
    preview,
  });

  return res.status(201).json({
    id: newImage.id,
    url: newImage.url,
    preview: newImage.preview,
  });
});

// Get details of a Spot from an id
router.get("/:spotId", async (req, res) => {
  const spot = await Spot.findByPk(req.params.spotId, {
    include: [
      {
        model: SpotImage,
        attributes: ["id", "url", "preview"],
      },
      {
        model: User,
        attributes: ["id", "firstName", "lastName"],
      },
    ],
  });

  if (!spot) {
    return res.status(404).json({ message: "Spot couldn't be found" });
  }

  const reviews = await Review.findAll({
    where: { spotId: spot.id },
    attributes: ["stars"],
  });

  const numReviews = reviews.length;
  const avgStarRating =
    numReviews > 0
      ? parseFloat(
          (
            reviews.reduce((sum, review) => sum + review.stars, 0) / numReviews
          ).toFixed(1)
        )
      : null;

  const spotData = spot.toJSON();
  spotData.numReviews = numReviews;
  spotData.avgStarRating = avgStarRating;

  // Rename User to Owner and SpotImages to match API docs
  spotData.Owner = spotData.User;
  delete spotData.User;
  spotData.SpotImages = spotData.SpotImages || [];

  res.json(spotData);
});

router.post("/", requireAuth, async (req, res) => {
  const { address, city, state, country, lat, lng, name, description, price } =
    req.body;

  const spot = {
    ownerId: req.user.id,
    address,
    city,
    state,
    country,
    lat,
    lng,
    name,
    description,
    price,
  };
  const errorOptions = {
    address: "Street address is required",
    city: "City is required",
    state: "State is required",
    country: "Country is required",
    lat: "Latitude must be within -90 and 90",
    lng: "Longitude must be within -180 and 180",
    name: "Name is required",
    nameLength: "Name must be less than 50 characters",
    description: "Description is required",
    price: "Price per day must be a positive number",
  };
  const errorsObj = {};

  for (item in spot) {
    if (spot[item] === undefined) {
      errorsObj[item] = errorOptions[item];
    }
  }
  if (spot.name) {
    if (spot.name.length >= 50) {
      errorsObj.name = errorOptions.nameLength;
    }
  }

  if (Object.entries(errorsObj).length > 0) {
    const responseError = {};
    responseError.message = "Bad Request";
    responseError.errors = errorsObj;
    return res.status(400).json(responseError);
  }
  const addedSpot = await Spot.create(spot);
  res.status(201).json(addedSpot);
});

router.put("/:spotId", requireAuth, async (req, res) => {
  const spotId = parseInt(req.params.spotId);
  const userId = req.user.id;
  const spot = await Spot.findByPk(spotId);
  const errorsObj = {};
  if (!spot) {
    errorsObj.message = "Spot couldn't be found";
    return res.status(404).json(errorsObj);
  }
  const { address, city, state, country, lat, lng, name, description, price } =
    req.body;
  const newSpotInfo = {
    address,
    city,
    state,
    country,
    lat,
    lng,
    name,
    description,
    price,
  };

  if (spot.ownerId !== userId) {
    errorsObj.message = "Forbidden";
    return res.status(403).json(errorsObj);
  }
  const errorOptions = {
    address: "Street address is required",
    city: "City is required",
    state: "State is required",
    country: "Country is required",
    lat: "Latitude must be within -90 and 90",
    lng: "Longitude must be within -180 and 180",
    name: "Name is required",
    nameLength: "Name must be less than 50 characters",
    description: "Description is required",
    price: "Price per day must be a positive number",
  };
  for (item in newSpotInfo) {
    if (newSpotInfo[item] === undefined) {
      errorsObj[item] = errorOptions[item];
    }
  }
  if (newSpotInfo.name) {
    if (newSpotInfo.name.length >= 50) {
      errorsObj.name = errorOptions.nameLength;
    }
  }
  if (Object.entries(errorsObj).length > 0) {
    const responseError = {};
    responseError.message = "Bad Request";
    responseError.errors = errorsObj;
    return res.status(400).json(responseError);
  }
  const updatedSpot = await Spot.update(
    {
      address: newSpotInfo.address,
      city: newSpotInfo.city,
      state: newSpotInfo.state,
      country: newSpotInfo.country,
      lat: newSpotInfo.lat,
      lng: newSpotInfo.lng,
      name: newSpotInfo.name,
      description: newSpotInfo.description,
      price: newSpotInfo.price,
    },
    { where: { id: spotId } }
  );
  const returnSpot = await Spot.findByPk(spotId);
  res.status(200).json(returnSpot);
});

router.delete("/:spotId", requireAuth, async (req, res) => {
  const spotId = parseInt(req.params.spotId);
  const userId = req.user.id;

  const spot = await Spot.findByPk(spotId);

  if (!spot) {
    return res.status(404).json({
      message: "Spot couldn't be found",
    });
  }

  if (spot.ownerId !== userId) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  await spot.destroy();

  res.status(200).json({
    message: "Successfully deleted",
  });
});

// Get all Bookings for a Spot based on the Spot's id
router.get("/:spotId/bookings", requireAuth, async (req, res) => {
  const { spotId } = req.params;
  const userId = req.user.id;

  // Find the spot
  const spot = await Spot.findByPk(spotId);

  // If the spot doesn't exist, return a 404 error
  if (!spot) {
    return res.status(404).json({
      message: "Spot couldn't be found",
    });
  }

  // Check if the current user is the owner of the spot
  const isOwner = spot.ownerId === userId;

  if (isOwner) {
    // Fetch bookings including User information
    const bookings = await Booking.findAll({
      where: { spotId },
      include: {
        model: User,
        attributes: ["id", "firstName", "lastName"],
      },
    });

    // Format the bookings
    const formattedBookings = bookings.map((booking) => ({
      User: booking.User,
      id: booking.id,
      spotId: booking.spotId,
      userId: booking.userId,
      startDate: booking.startDate,
      endDate: booking.endDate,
      createdAt: booking.createdAt.toISOString().replace("T", " ").slice(0, 19),
      updatedAt: booking.updatedAt.toISOString().replace("T", " ").slice(0, 19),
    }));

    // Send the response
    return res.status(200).json({ Bookings: formattedBookings });
  } else {
    // Fetch bookings with limited information
    const bookings = await Booking.findAll({
      where: { spotId },
      attributes: ["spotId", "startDate", "endDate"],
    });

    // Send the response
    return res.status(200).json({ Bookings: bookings });
  }
});

// Create a Booking from a Spot based on the Spot's id
router.post("/:spotId/bookings", requireAuth, async (req, res, next) => {
  const { spotId } = req.params;
  const { startDate, endDate } = req.body;
  const userId = req.user.id;

  // Convert dates to Date objects
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();

  // Validation errors
  const errors = {};

  // Check if startDate is in the past
  if (start < today) {
    errors.startDate = "startDate cannot be in the past";
  }

  // Check if endDate is on or before startDate
  if (end <= start) {
    errors.endDate = "endDate cannot be on or before startDate";
  }

  try {
    // Find the spot
    const spot = await Spot.findByPk(spotId);

    if (!spot) {
      return res.status(404).json({
        message: "Spot couldn't be found",
      });
    }

    // Check for booking conflicts
    const conflictingBookings = await Booking.findAll({
      where: {
        spotId: spotId,
        [Op.or]: [
          {
            startDate: {
              [Op.between]: [startDate, endDate],
            },
          },
          {
            endDate: {
              [Op.between]: [startDate, endDate],
            },
          },
          {
            startDate: {
              [Op.lte]: startDate,
            },
            endDate: {
              [Op.gte]: endDate,
            },
          },
        ],
      },
    });

    if (conflictingBookings.length > 0) {
      const conflictErrors = {};

      // Check for start date conflicts
      const startDateConflict = conflictingBookings.some(
        (booking) =>
          new Date(startDate) >= new Date(booking.startDate) &&
          new Date(startDate) <= new Date(booking.endDate)
      );
      if (startDateConflict) {
        conflictErrors.startDate =
          "Start date conflicts with an existing booking";
      }

      // Check for end date conflicts
      const endDateConflict = conflictingBookings.some(
        (booking) =>
          new Date(endDate) >= new Date(booking.startDate) &&
          new Date(endDate) <= new Date(booking.endDate)
      );
      if (endDateConflict) {
        conflictErrors.endDate = "End date conflicts with an existing booking";
      }

      if (Object.keys(conflictErrors).length > 0) {
        return res.status(403).json({
          message: "Sorry, this spot is already booked for the specified dates",
          errors: conflictErrors,
        });
      }
    }

    // Create the booking
    const booking = await Booking.create({
      spotId: spotId,
      userId: userId,
      startDate: startDate,
      endDate: endDate,
    });

    // Format createdAt and updatedAt
    const formattedBooking = booking.toJSON();
    formattedBooking.createdAt = new Date(formattedBooking.createdAt)
      .toISOString()
      .replace("T", " ")
      .slice(0, 19);
    formattedBooking.updatedAt = new Date(formattedBooking.updatedAt)
      .toISOString()
      .replace("T", " ")
      .slice(0, 19);

    return res.status(201).json(formattedBooking);
  } catch (err) {
    next(err);
  }
});

// Get all Reviews by a Spot's id
router.get("/:spotId/reviews", async (req, res) => {
  const { spotId } = req.params;

  try {
    const spot = await Spot.findByPk(spotId);

    if (!spot) {
      return res.status(404).json({ message: "Spot couldn't be found" });
    }

    const reviews = await Review.findAll({
      where: { spotId },
      include: [
        {
          model: User,
          attributes: ["id", "firstName", "lastName"],
        },
        {
          model: ReviewImage,
          attributes: ["id", "url"],
        },
      ],
    });

    const formattedReviews = reviews.map((review) => {
      const reviewData = review.toJSON();
      reviewData.ReviewImages = reviewData.ReviewImages || [];
      return reviewData;
    });

    res.status(200).json({ Reviews: formattedReviews });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", errors: err.message });
  }
});

// Create a Review for a Spot based on the Spot's id
router.post(
  "/:spotId/reviews",
  requireAuth,
  [
    check("review")
      .exists({ checkFalsy: true })
      .withMessage("Review text is required"),
    check("stars")
      .isInt({ min: 1, max: 5 })
      .withMessage("Stars must be an integer from 1 to 5"),
  ],
  async (req, res) => {
    const { spotId } = req.params;
    const { review, stars } = req.body;
    const userId = req.user.id;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = {};
      errors.array().forEach((error) => {
        formattedErrors[error.path] = error.msg;
      });
      return res.status(400).json({
        message: "Bad Request",
        errors: formattedErrors,
      });
    }

    try {
      const spot = await Spot.findByPk(spotId);

      if (!spot) {
        return res.status(404).json({ message: "Spot couldn't be found" });
      }

      const existingReview = await Review.findOne({
        where: {
          spotId,
          userId,
        },
      });

      if (existingReview) {
        return res.status(500).json({
          message: "User already has a review for this spot",
        });
      }

      const newReview = await Review.create({
        spotId,
        userId,
        review,
        stars,
      });

      const formattedReview = {
        id: newReview.id,
        userId: newReview.userId,
        spotId: newReview.spotId,
        review: newReview.review,
        stars: newReview.stars,
        createdAt: newReview.createdAt
          .toISOString()
          .replace("T", " ")
          .slice(0, 19),
        updatedAt: newReview.updatedAt
          .toISOString()
          .replace("T", " ")
          .slice(0, 19),
      };

      res.status(201).json(formattedReview);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error", errors: err.message });
    }
  }
);

// delete a spot image

router.delete("/spot-images/:imageId", requireAuth, async (req, res) => {
  const { imageId } = req.params;
  const userId = req.user.id;

  try {
    const spotImage = await SpotImage.findByPk(imageId, {
      include: {
        model: Spot,
        attributes: ["ownerId"],
      },
    });

    if (!spotImage) {
      return res.status(404).json({ message: "Spot Image couldn't be found" });
    }

    if (spotImage.Spot.ownerId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await spotImage.destroy();

    res.status(200).json({ message: "Successfully deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;