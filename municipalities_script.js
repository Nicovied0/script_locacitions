const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

// Express Configuration
const app = express();
const PORT = process.env.PORT || 3000;
const DB_URI = process.env.DB_DEV;

// Connection to MongoDB database
mongoose.connect(`${DB_URI}`);
const db = mongoose.connection;

// Mongoose connection event handling
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", function () {
  console.log("Successfully connected to MongoDB.");
});

// Definition of the municipalities schema
const municipalitySchema = new mongoose.Schema({
    id: String,
    name: String,
    province: {
      idReference: String, 
      name: String,
    },
  });

// Model for the municipalities collection
const Municipality = mongoose.model("Municipality", municipalitySchema);

// Route for importing municipalities
app.get("/import-municipalities", async (req, res) => {
  try {
    const response = await axios.get(
      "https://apis.datos.gob.ar/georef/api/municipios?max=3000"
    );
    const municipalities = response.data.municipios;

    // Saving each municipality to the database
    for (const municipalityData of municipalities) {
      console.log("municipality: " + municipalityData.id);
      const municipality = new Municipality({
        id: municipalityData.id,
        name: municipalityData.nombre,
        province: {
            idReference: municipalityData.provincia.id, 
            name: municipalityData.provincia.nombre,
          },
      });

      await municipality.save();
    }

    res.json({ message: "Municipalities saved successfully to the database." });
  } catch (error) {
    console.error("Error fetching or saving municipalities:", error);
    res.status(500).json({ error: "Error fetching or saving municipalities." });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
