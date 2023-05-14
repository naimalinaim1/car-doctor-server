const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

/**
 * -----------------------------------------------
 *          mongodb START                        |
 * -----------------------------------------------
 */

const uri = `mongodb+srv://car-doctor:55cUPMEG3JF3qTtI9@cluster0.ybzmsy1.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const run = async () => {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();

    const serviceCollection = client.db("car-doctor").collection("services");
    const bookingCollection = client.db("car-doctor").collection("bookings");

    // jwt
    app.post("/jwt", (req, res) => {
      const user = req.body;
      console.log("jwt", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // find all service from mongodb
    app.get("/services", async (req, res) => {
      const result = await serviceCollection.find().toArray();
      res.send(result);
    });

    // find a service from mongodb
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };
      const result = await serviceCollection.findOne(query, options);
      res.send(result);
    });

    // bookings
    // get booking service
    app.get("/bookings", verifyJWT, async (req, res) => {
      const decoded = req.decoded;

      const email = req.query.email;
      if (decoded.email !== email) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }

      let query = {};
      if (email) {
        query = { email };
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    // add a service booking
    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const status = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          ...status,
        },
      };

      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // delete a service
    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
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
};
run().catch(console.dir);

/**
 * -----------------------------------------------
 *                mongodb End                    |
 * -----------------------------------------------
 */

// route
app.get("/", (req, res) => {
  res.send("Doctor is running");
});

app.listen(port, () => {
  console.log(`Car doctor server is running on port: ${port}`);
});
