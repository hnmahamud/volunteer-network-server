const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

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
    cb(null, "uploads/events/");
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

// Delete image from server
const deleteImg = (req, res, next) => {
  const imageName = req.headers["custom-header"];
  const filePath = path.join(__dirname, "uploads/events", imageName);
  // Check if the file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // File does not exist
      return res.status(404).send("File not found");
    }
    // Delete the file
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Error deleting file", err);
        return res.status(500).send("Error deleting file");
      }
      // Set the headers before sending the response
      // res.status(200).send("File deleted successfully");
      console.log("File deleted successfully");
      next();
    });
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const database = client.db("volunteerNetworkDB");
    const volunteers = database.collection("volunteers");
    const events = database.collection("events");
    const usersEvents = database.collection("usersEvents");

    app.get("/volunteers", async (req, res) => {
      const cursor = volunteers.find({});
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/volunteers", async (req, res) => {
      const volunteer = req.body;

      const query = { email: volunteer.email };
      const isExist = await volunteers.findOne(query);
      if (isExist) {
        console.log("Email already registered!");
        return res.send({ error: true, message: "Email already registered!" });
      }
      const doc = {
        ...volunteer,
      };
      const result = await volunteers.insertOne(doc);
      if (result.insertedId) {
        console.log("Volunteer registration successful!");
      } else {
        console.log("Volunteer registration failed!");
      }
      res.send(result);
    });

    app.delete("/volunteers/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await volunteers.deleteOne(query);

      if (result.deletedCount === 1) {
        console.log("Successfully deleted one document.");
      } else {
        console.log("No documents matched the query. Deleted 0 documents.");
      }
      res.send(result);
    });

    app.get("/users-events", async (req, res) => {
      const cursor = usersEvents.find({});
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/users-events", async (req, res) => {
      const userEvent = req.body;
      const doc = {
        ...userEvent,
      };
      const result = await usersEvents.insertOne(doc);
      if (result.insertedId) {
        console.log("Event added successful!");
      } else {
        console.log("Event added failed!");
      }
      res.send(result);
    });

    app.delete("/users-events/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersEvents.deleteOne(query);

      if (result.deletedCount === 1) {
        console.log("Successfully deleted one document.");
      } else {
        console.log("No documents matched the query. Deleted 0 documents.");
      }
      res.send(result);
    });

    app.get("/events", async (req, res) => {
      const cursor = events.find({});
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/events/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await events.findOne(query);
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

    app.put("/events/:id", upload.single("bannerImage"), async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };

      // Delete image from server
      if (req?.file?.filename) {
        const imageName = req.headers["custom-header"];
        const filePath = path.join(__dirname, "uploads/events", imageName);
        // Check if the file exists
        fs.access(filePath, fs.constants.F_OK, (err) => {
          if (err) {
            // File does not exist
            return res.status(404).send("File not found");
          }
          // Delete the file
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error("Error deleting file", err);
              return res.status(500).send("Error deleting file");
            }
            // Set the headers before sending the response
            // res.status(200).send("File deleted successfully");
            console.log("File deleted successfully");
          });
        });
      }

      const eventData = {
        event_title: req.body.eventTitle,
        event_date: req.body.eventDate,
        description: req.body.description,
        banner: req?.file?.filename || req.headers["custom-header"],
      };
      const updateDoc = {
        $set: {
          ...eventData,
        },
      };
      const result = await events.updateOne(filter, updateDoc, options);
      if (result.modifiedCount === 1) {
        console.log("Successfully updated one document.");
      } else {
        console.log("No documents matched the query. Updated 0 documents.");
      }
      res.send(result);
    });

    app.delete("/events/:id", deleteImg, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await events.deleteOne(query);

      if (result.deletedCount === 1) {
        console.log("Successfully deleted one document.");
      } else {
        console.log("No documents matched the query. Deleted 0 documents.");
      }
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
