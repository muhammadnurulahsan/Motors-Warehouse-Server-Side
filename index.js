const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 5000;

//Middleware
//middleware
app.use(express.json());
app.use(cors());
const corsConfig = {
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
};
app.use(cors(corsConfig));
app.options("*", cors(corsConfig));
app.use(express.json());
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept,authorization"
  );
  next();
});

//MongoDb Server Link
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.huhup.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// JWT Verify Function
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    req.decoded = decoded;
    next();
  });
}

//Main Function
async function run() {
  try {
    await client.connect();
    const itemsCollection = client.db("motorsWarehouse").collection("items");
    console.log("Connected to MongoDB");

    app.post("/login", (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "15d",
      });
      res.send({ token });
    });

    //getting all products
    app.get("/items", async (req, res) => {
      const query = {};
      const cursor = itemsCollection.find(query);
      const items = await cursor.toArray();
      res.send(items);
    });

    //getting my products using user email
    app.get("/user", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.query.email;
      if (email === decodedEmail) {
        const query = { supplierEmail: email };
        const cursor = itemsCollection.find(query);
        const items = await cursor.toArray();
        res.send(items);
      } else {
        return res.status(403).send({ message: "Forbidden Access!" });
      }
    });

    //Update Quantity By Put
    app.put("/items/:id", async (req, res) => {
      const { id } = req.params;
      const data = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateQuantity = {
        $set: {
          quantity: data.newQuantity,
        },
      };
      const result = await itemsCollection.updateOne(
        filter,
        updateQuantity,
        options
      );
      res.send(result);
    });

    //Get By Id
    app.get("/items/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const item = await itemsCollection.findOne(query);
      res.send(item);
    });

    //Post Add Item
    app.post("/items", async (req, res) => {
      const newItem = req.body;
      const result = await itemsCollection.insertOne(newItem);
      res.send(result);
    });

    //DELETE Item
    app.delete("/items/:id", async (req, res) => {
      const id = req.params;
      const query = { _id: ObjectId(id) };
      const result = await itemsCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
    // client.close();
  }
}
run().catch(console.dir);

//Root Routes
app.get("/", (req, res) => {
  res.send("Backend Server IS Running ");
});

//App Listen
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
