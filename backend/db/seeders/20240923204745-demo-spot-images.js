"use strict";

const { SpotImage, Spot } = require("../models");
const { Op } = require("sequelize");

let options = {};
if (process.env.NODE_ENV === "production") {
  options.schema = process.env.SCHEMA;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const demoSpots = await Spot.findAll({
      where: {
        name: {
          [Op.in]: [
            "Cozy SF Apartment",
            "Manhattan Loft",
            "Hollywood Hills Villa",
          ],
        },
      },
      attributes: ["id", "name"],
    });

    if (demoSpots.length === 0) {
      console.error("No spots found. Ensure the spots exist in the database.");
      return;
    }

    await SpotImage.bulkCreate(
      [
        {
          spotId: demoSpots.find((spot) => spot.name === "Cozy SF Apartment")
            .id,
          url: "https://plus.unsplash.com/premium_photo-1661915661139-5b6a4e4a6fcc?q=80&w=967&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
          preview: true,
        },
        {
          spotId: demoSpots.find((spot) => spot.name === "Cozy SF Apartment")
            .id,
          url: "https://images.unsplash.com/photo-1572120360610-d971b9d7767c?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
          preview: false,
        },
        {
          spotId: demoSpots.find((spot) => spot.name === "Manhattan Loft").id,
          url: "https://plus.unsplash.com/premium_photo-1689609950112-d66095626efb?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
          preview: true,
        },
        {
          spotId: demoSpots.find((spot) => spot.name === "Manhattan Loft").id,
          url: "https://images.unsplash.com/photo-1504615755583-2916b52192a3?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
          preview: false,
        },
        {
          spotId: demoSpots.find(
            (spot) => spot.name === "Hollywood Hills Villa"
          ).id,
          url: "https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
          preview: true,
        },
        {
          spotId: demoSpots.find(
            (spot) => spot.name === "Hollywood Hills Villa"
          ).id,
          url: "https://images.unsplash.com/photo-1434082033009-b81d41d32e1c?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
          preview: false,
        },
      ],
      { validate: true }
    );
  },

  async down(queryInterface, Sequelize) {
    options.tableName = "SpotImages";
    return queryInterface.bulkDelete(options, null, {});
  },
};
