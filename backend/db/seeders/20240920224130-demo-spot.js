"use strict";

const { Spot, User } = require("../models");

/** @type {import('sequelize-cli').Migration} */
let options = {};
if (process.env.NODE_ENV === "production") {
  options.schema = process.env.SCHEMA;
}
module.exports = {
  async up(queryInterface, Sequelize) {
    const demoUsers = await User.findAll({
      attributes: ["id", "username"],
      where: {
        username: ["Demo-lition", "FakeUser1", "FakeUser2"],
      },
    });

    await Spot.bulkCreate(
      [
        {
          ownerId: demoUsers.find((user) => user.username === "Demo-lition").id,
          address: "123 Maple Street",
          city: "San Francisco",
          state: "California",
          country: "USA",
          lat: 37.7749,
          lng: -122.4194,
          name: "Cozy SF Apartment",
          description:
            "A charming apartment in the heart of San Francisco with a view of the bay.",
          price: 250.0,
        },
        {
          ownerId: demoUsers.find((user) => user.username === "Demo-lition").id,
          address: "456 Oak Avenue",
          city: "New York",
          state: "New York",
          country: "USA",
          lat: 40.7128,
          lng: -74.006,
          name: "Manhattan Loft",
          description:
            "Spacious loft in downtown Manhattan, walking distance to major attractions.",
          price: 300.0,
        },
        {
          ownerId: demoUsers.find((user) => user.username === "Demo-lition").id,
          address: "789 Pine Road",
          city: "Los Angeles",
          state: "California",
          country: "USA",
          lat: 34.0522,
          lng: -118.2437,
          name: "Hollywood Hills Villa",
          description:
            "Luxurious villa with a pool and stunning views of the Hollywood sign.",
          price: 500.0,
        },
        {
          ownerId: demoUsers.find((user) => user.username === "FakeUser1").id,
          address: "101 Beach Boulevard",
          city: "Miami",
          state: "Florida",
          country: "USA",
          lat: 25.7617,
          lng: -80.1918,
          name: "Beachfront Condo",
          description:
            "Modern condo with direct access to Miami Beach and ocean views.",
          price: 275.0,
        },
        {
          ownerId: demoUsers.find((user) => user.username === "FakeUser1").id,
          address: "202 Mountain View Drive",
          city: "Denver",
          state: "Colorado",
          country: "USA",
          lat: 39.7392,
          lng: -104.9903,
          name: "Rocky Mountain Retreat",
          description:
            "Cozy cabin with breathtaking views of the Rocky Mountains.",
          price: 180.0,
        },
        {
          ownerId: demoUsers.find((user) => user.username === "FakeUser1").id,
          address: "303 Bourbon Street",
          city: "New Orleans",
          state: "Louisiana",
          country: "USA",
          lat: 29.9511,
          lng: -90.0715,
          name: "French Quarter Gem",
          description:
            "Historic property in the heart of the French Quarter, perfect for experiencing NOLA culture.",
          price: 220.0,
        },
        {
          ownerId: demoUsers.find((user) => user.username === "FakeUser2").id,
          address: "404 Lakeside Lane",
          city: "Chicago",
          state: "Illinois",
          country: "USA",
          lat: 41.8781,
          lng: -87.6298,
          name: "Luxury Lakeshore Apartment",
          description:
            "High-rise apartment with stunning views of Lake Michigan and easy access to downtown Chicago.",
          price: 280.0,
        },
        {
          ownerId: demoUsers.find((user) => user.username === "FakeUser2").id,
          address: "505 Desert Road",
          city: "Phoenix",
          state: "Arizona",
          country: "USA",
          lat: 33.4484,
          lng: -112.074,
          name: "Desert Oasis",
          description:
            "Modern home with a private pool, perfect for enjoying the Arizona sunshine.",
          price: 200.0,
        },
        {
          ownerId: demoUsers.find((user) => user.username === "FakeUser2").id,
          address: "606 Rainier Avenue",
          city: "Seattle",
          state: "Washington",
          country: "USA",
          lat: 47.6062,
          lng: -122.3321,
          name: "Seattle Skyline Suite",
          description:
            "Upscale apartment with views of the Space Needle and easy access to Pike Place Market.",
          price: 260.0,
        },
        {
          ownerId: demoUsers.find((user) => user.username === "FakeUser2").id,
          address: "707 Peachtree Street",
          city: "Atlanta",
          state: "Georgia",
          country: "USA",
          lat: 33.749,
          lng: -84.388,
          name: "Southern Charm Bungalow",
          description:
            "Charming bungalow in a historic Atlanta neighborhood, close to major attractions.",
          price: 190.0,
        },
        {
          ownerId: demoUsers.find((user) => user.username === 'Demo-lition').id,
          address: '123 Urban Ave',
          city: 'Metropolis',
          state: 'NY',
          country: 'USA',
          lat: 40.7128,
          lng: -74.0060,
          name: 'Urban Studio',
          description: 'A modern studio apartment in the heart of the city.',
          price: 150,
        }
      ],
      { validate: true }
    );
  },

  async down(queryInterface, Sequelize) {
    options.tableName = "Spots";
    const Op = Sequelize.Op;
    return queryInterface.bulkDelete(options, null, {});
  },
};
