const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
require("dotenv").config();

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
  try {
    if (!accessToken) {
      return res.status(500).send("Access token not available.");
    }

    const response = await axios.get(
      "https://api.prokerala.com/v2/astrology/chart",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: req.query, 
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching astrology chart:", error.message);
    res.status(500).send(error.message);
  }
});
app.listen(4000, () => console.log("Proxy server running on port 4000"));
