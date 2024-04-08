const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

// Express Configuration
const app = express();
const PORT = process.env.PORT || 3000;
const DB_URI = process.env.DB_DEV;

// Connection to MongoDB database
mongoose.connect(DB_URI);
const db = mongoose.connection;

// Mongoose connection event handling
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", function () {
  console.log("Successfully connected to MongoDB.");
});

// Definition of the locations schema
const locationSchema = new mongoose.Schema({
  name: String,
  department: {
    idReference: String,
    name: String
  },
  municipality: {
    idReference: String,
    name: String
  },
  province: {
    idReference: String,
    name: String
  },
  postal_code: String
});

// Model for the locations collection
const Location = mongoose.model("Location", locationSchema);

// Function to extract digits from a string
function extractDigits(str) {
  return str ? str.replace(/\D/g, '') : null;
}

// Route for importing locations
app.get("/import-locations", async (req, res) => {
  try {
    const response = await axios.get("https://apis.datos.gob.ar/georef/api/localidades?max=5000");
    const locations = response.data.localidades;

    // Save each location to the database
    for (const locationData of locations) {
      try {
        // Get coordinates using Nominatim API
        const coordinatesResponse = await axios.get(`https://nominatim.openstreetmap.org/search?q=${locationData.nombre},${locationData.provincia.nombre}&format=json&addressdetails=1`);
        const coordinates = coordinatesResponse.data[0];
        const lat = coordinates ? coordinates.lat : null;
        const lon = coordinates ? coordinates.lon : null;

        // Get postal code using reverse geocoding with obtained coordinates
        const postalCodeResponse = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
        const postalCodeWithLetters = postalCodeResponse.data.address.postcode;
        const postalCode = extractDigits(postalCodeWithLetters);

        // Check if the location already exists in the database
        const existingLocation = await Location.findOne({
          name: locationData.nombre,
          postal_code: postalCode
        });

        // If the location doesn't exist, save it to the database
        if (!existingLocation) {
          const location = new Location({
            name: locationData.nombre,
            department: {
              idReference: locationData.departamento.id,
              name: locationData.departamento.nombre
            },
            municipality: {
              idReference: locationData.municipio.id,
              name: locationData.municipio.nombre
            },
            province: {
              idReference: locationData.provincia.id,
              name: locationData.provincia.nombre
            },
            postal_code: postalCode
          });
          await location.save();
        }
      } catch (error) {
        console.error("Error saving location:", error);
        // Log the error to the console
        console.log(error);
      }
    }

    res.json({ message: "Locations saved successfully to the database." });
  } catch (error) {
    console.error("Error getting locations:", error);
    res.status(500).json({ error: "Error getting locations." });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
