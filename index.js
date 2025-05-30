const express = require("express");
const axios = require("axios");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/user");

const app = express();
app.use(cors());
app.use(express.json());
require("dotenv").config();

// MongoDB Connection
const MONGODB_URI = "mongodb+srv://YOGI2004:BXHJKys0XZ6HyZS1@cluster0.pdqbv.mongodb.net/astro-inight";

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB:', err));

let accessToken = ""; 
let tokenExpiry = 0; 

const fetchToken = async () => {
  try {
    const response = await axios.post(
      "https://api.prokerala.com/token",
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.CLIENT_ID, 
        client_secret: process.env.CLIENT_SECRET, 
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    accessToken = response.data.access_token;
    tokenExpiry = Date.now() + response.data.expires_in * 1000; // Convert to milliseconds

  } catch (error) {
    console.error("Error fetching token:", error.message);
  }
};

setInterval(() => {
  if (Date.now() > tokenExpiry - 60000) {
    fetchToken();
  }
}, 60000); 

fetchToken();

app.get("/astrology-chart", async (req, res) => {
  // console.log(accessToken);
  try {
    if (!accessToken) {
      return res.status(500).send("Access token not available.");
    }
    // console.log(req.body)
    const response = await axios.get(
      "https://api.prokerala.com/v2/astrology/chart",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: req.query, 
      }
    );
    // console.log(response.data);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching astrology chart:", error.message);
    res.status(500).send(error.message);
  }
});
app.get("/horoscope", async (req, res) => {
  // console.log(req.query);
  // console.log(accessToken)
  try {
    if (!accessToken) {
      return res.status(500).send("Access token not available.");
    }
    
    const { sign } = req.query;
    if (!sign) {
      return res.status(400).send("'sign' parameter is required");
    }
    
    const datetime = formatDatetime(req.query.datetime);
    // console.log("Formatted datetime:", datetime);
    
    const url = `https://api.prokerala.com/v2/horoscope/daily/advanced?datetime=${datetime}&sign=${sign}&type=${req.query.type}`;
    // console.log("Requesting URL:", url);
    
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching horoscope:", error.message);
    res.status(500).send(error.message);
  }
});

/**
 * Formats datetime for Prokerala API with the correct timezone encoding (%2B05:30)
 * @param {string} inputDatetime - Optional datetime string from request
 * @return {string} Properly formatted datetime
 */
function formatDatetime(inputDatetime) {
  if (!inputDatetime) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}%2B05:30`;
  } else if (!inputDatetime.includes('%2B')) {
    return inputDatetime.replace('+', '%2B');
  }
  
  return inputDatetime;
}

// Add this new endpoint to your Express server to handle user data storage
app.post("/store-user-data", async (req, res) => {
  try {
    const userData = req.body;
    if (!userData.name || !userData.dob || !userData.tob || !userData.pob) {
      return res.status(400).json({ error: "Missing required user information" });
    }
    
    // Create a new user instance
    const newUser = new User({
      name: userData.name,
      dob: userData.dob,
      tob: userData.tob,
      pob: userData.pob
    });
    
    // Save the user to the database
    const savedUser = await newUser.save();
    
    res.status(201).json({ 
      success: true, 
      message: "User data stored successfully",
      user: savedUser
    });
    
  } catch (error) {
    console.error("Error storing user data:", error);
    res.status(500).json({ 
      error: "Failed to store user data",
      message: error.message 
    });
  }
});

app.listen(4000, () => console.log("Proxy server running on port 4000"));
