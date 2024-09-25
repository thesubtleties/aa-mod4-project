const express = require("express");
const router = express.Router();
const { Spot, Review, SpotImage, sequelize, User } = require("../../db/models");
const { Op } = require("sequelize");
const { requireAuth } = require("../../utils/auth");

// Get all Spots
router.get("/", async (req, res) => {
  try {
    // Fetch all spots
    const spots = await Spot.findAll({
      attributes: {
        include: [
          // Include avgRating
          [sequelize.fn("AVG", sequelize.col("Reviews.stars")), "avgRating"],
        ],
      },
      include: [
        // Include associated Reviews
        {
          model: Review,
          attributes: [],
        },
        // Include associated SpotImages to get previewImage
        {
          model: SpotImage,
          attributes: ["url", "preview"],
        },
      ],
      group: ["Spot.id", "SpotImages.id"],
    });

    // Format the spots data
    const Spots = spots.map((spot) => {
      const spotData = spot.toJSON();

      // Get previewImage URL where preview is true
      const previewImageObj = spotData.SpotImages.find(
        (image) => image.preview === true
      );
      spotData.previewImage = previewImageObj ? previewImageObj.url : null;

      // Remove SpotImages array from spotData
      delete spotData.SpotImages;

      // Format avgRating to one decimal place if not null
      if (spotData.avgRating !== null) {
        spotData.avgRating = parseFloat(spotData.avgRating).toFixed(1);
      }

      return spotData;
    });

    return res.status(200).json({ Spots });
  } catch (err) {
    console.error(err); // Log the error for debugging
    return res
      .status(500)
      .json({ message: "Server error", errors: err.message });
  }
});

// Get all Spots owned by the Current User
router.get("/current", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch all spots where ownerId matches current user
    const spots = await Spot.findAll({
      where: {
        ownerId: userId,
      },
      attributes: {
        include: [
          // Include avgRating
          [
            sequelize.literal(`(
              SELECT AVG("Reviews"."stars")
              FROM "Reviews"
              WHERE "Reviews"."spotId" = "Spot"."id"
            )`),
            "avgRating",
          ],
          // Include previewImage
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
    });

    // Format spots data
    const Spots = spots.map((spot) => {
      const spotData = spot.toJSON();

      // Format createdAt and updatedAt to 'YYYY-MM-DD HH:mm:ss'
      spotData.createdAt = new Date(spotData.createdAt)
        .toISOString()
        .replace("T", " ")
        .slice(0, 19);
      spotData.updatedAt = new Date(spotData.updatedAt)
        .toISOString()
        .replace("T", " ")
        .slice(0, 19);

      // Format avgRating to one decimal place if not null
      if (spotData.avgRating !== null) {
        spotData.avgRating = parseFloat(spotData.avgRating).toFixed(1);
      }

      return spotData;
    });

    return res.status(200).json({ Spots });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Server error", errors: err.message });
  }
});

router.post("/:spotId/images", requireAuth, async (req, res) => {
  const { spotId } = req.params;
  const { url, preview } = req.body;

  // Find the spot
  const spot = await Spot.findByPk(spotId);

  if (!spot) {
    return res.status(404).json({
      message: "Spot couldn't be found",
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
  const { spotId } = req.params;

  // Find the spot by its ID with aggregated avgStarRating and numReviews
  const spot = await Spot.findOne({
    where: { id: spotId },
    attributes: {
      include: [
        // Include avgStarRating
        [sequelize.fn("AVG", sequelize.col("Reviews.stars")), "avgStarRating"],
        // Include numReviews
        [sequelize.fn("COUNT", sequelize.col("Reviews.id")), "numReviews"],
      ],
    },
    include: [
      // Include associated Reviews for aggregation
      {
        model: Review,
        attributes: [],
      },
      // Include SpotImages
      {
        model: SpotImage,
        attributes: ["id", "url", "preview"],
      },
      // Include Owner (aliased User)
      {
        model: User,
        as: "Owner",
        attributes: ["id", "firstName", "lastName"],
      },
    ],
    group: ["Spot.id", "SpotImages.id", "Owner.id"],
  });

  // If spot doesn't exist, return 404 error
  if (!spot) {
    return res.status(404).json({
      message: "Spot couldn't be found",
    });
  }

  // Convert spot instance to plain object
  const spotData = spot.toJSON();

  // Format avgStarRating to one decimal place if not null
  if (spotData.avgStarRating !== null) {
    spotData.avgStarRating = parseFloat(spotData.avgStarRating).toFixed(1);
  } else {
    spotData.avgStarRating = null;
  }

  // Format numReviews as integer
  spotData.numReviews = parseInt(spotData.numReviews) || 0;

  // Format createdAt and updatedAt
  const formatDate = (date) => {
    return new Date(date).toISOString().replace("T", " ").slice(0, 19);
  };
  spotData.createdAt = formatDate(spotData.createdAt);
  spotData.updatedAt = formatDate(spotData.updatedAt);

  return res.status(200).json(spotData);
});

router.post("/", async (req, res) => {
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
  if (spot.name.length >= 50) {
    errorsObj.name = errorOptions.nameLength;
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

router.put("/:spotId", async (req, res) => {
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
    errorsObj.message = "Cannot update a Spot you do not own";
    return res.status(400).json(errorsObj);
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
  if (newSpotInfo.name.length >= 50) {
    errorsObj.name = errorOptions.nameLength;
  }
  if (Object.entries(errorsObj).length > 0) {
    const responseError = {};
    responseError.message = "Bad Request";
    responseError.errors = errorsObj;
    return res.status(400).json(responseError);
  }
  const updatedSpot = await Spot.findByPk(spotId);
  res.status(201).json(updatedSpot);
});

router.delete("/:spotId", async (req, res) => {
  const spotId = parseInt(req.params.spotId);
  const userId = req.user.id;
  const spot = await Spot.findByPk(spotId);
  const errorsObj = {};
  if (!spot) {
    errorsObj.message = "Spot couldn't be found";
    return res.status(404).json(errorsObj);
  }
  const spotToDelete = await Spot.findByPk(spotId);
  if (spotToDelete.ownerId !== userId) {
    errorsObj.message = "Cannot delete a Spot you do not own";
    return res.status(400).json(errorsObj);
  }
  await Spot.destroy({
    where: {
      id: spotId,
    },
  });
  const successMessage = {};
  successMessage.message = "Successfully deleted";
  res.json(successMessage);
});

module.exports = router;
