const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const multer = require("multer");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
// Serve static files from the 'uploads' folder
app.use("/uploads", express.static("uploads"));

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6jia9zl.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const database = client.db("volunteerNetworkDB");
    const volunteers = database.collection("volunteers");
    const events = database.collection("events");

    app.get("/volunteers", async (req, res) => {
      const cursor = volunteers.find({});
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/events", async (req, res) => {
      const cursor = events.find({});
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/events", upload.single("bannerImage"), async (req, res) => {
      const eventData = {
        event_title: req.body.eventTitle,
        event_date: req.body.eventDate,
        description: req.body.description,
        banner: req.file.filename,
      };

      const result = await events.insertOne(eventData);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server running...");
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
