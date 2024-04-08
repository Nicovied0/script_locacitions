const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();


// Express Configuration
const app = express();
const PORT = process.env.PORT || 3000;
const DB_URI = process.env.DB_DEV

// Connection to MongoDB database
mongoose.connect(`${DB_URI}`);
const db = mongoose.connection;

// Mongoose connection event handling
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', function() {
    console.log('Successfully connected to MongoDB.');
});

// Definition of the provinces schema
const provinceSchema = new mongoose.Schema({
    id: String,
    name: String,
});

// Model for the provinces collection
const Province = mongoose.model('Province', provinceSchema);

// Route for importing provinces
app.get('/import-provinces', async (req, res) => {
    try {
        const response = await axios.get('https://apis.datos.gob.ar/georef/api/provincias');
        const provinces = response.data.provincias;

        // Saving each province to the database
        for (const provinceData of provinces) {
            console.log("province: " + provinceData.id)
            const province = new Province({
                id: provinceData.id,
                name: provinceData.nombre,
            });

            await province.save();
        }

        res.json({ message: 'Provinces saved successfully to the database.' });
    } catch (error) {
        console.error('Error fetching or saving provinces:', error);
        res.status(500).json({ error: 'Error fetching or saving provinces.' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
