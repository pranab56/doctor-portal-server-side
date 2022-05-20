const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6ffp4.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const serviceCollection = client.db("doctor-portal").collection("service");
    const bookingCollection = client.db("doctor-portal").collection("data");
    app.get("/service", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const service = await cursor.toArray();
      res.send(service);
    });
    
    app.get("/data",async (req,res)=>{
       const query={};
       const cursor=await bookingCollection.find(query).toArray();
       res.send(cursor)
    })

    app.post("/data", async (req, res) => {
      const body = req.body;
      // booking er somoy same 1 jon user sudhu 1 date a 1 tretment korara jonno
      const query = {
        TreatmentName: body.TreatmentName,
        date: body.date,
        name: body.name,
      };
      const exists = await bookingCollection.findOne(query);
      if (exists) {
        return res.send({ success: false, body: exists });
      }
      //    aituku code
      const result = await bookingCollection.insertOne(body);
      res.send({ success: true, result });
    });



// ------------------------------------------------------------------------------
    // booked dile book er na dikhiye baki je available ace segulo ke dekhabe

    app.get("/available", async (req, res) => {
      const date = req.query.date;
      const services = await serviceCollection.find().toArray();

      const query = { date: date };
      const booking = await bookingCollection.find(query).toArray();
      services.forEach((service) => {
        const serviceBooked = booking.filter(
          (b) => b.TreatmentName === service.name
        );
        const booked = serviceBooked.map((s) => s.slot);
        const available = service.slots.filter((x) => !booked.includes(x));
        service.slots = available;
      });

      res.send(services);
    });
// -------------------------------------------------------------------------
// -------------------------------------------------------------------------




  } finally {
    // await client.close()
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("doctor portal in connected");
});

app.listen(port, () => {
  console.log("database connected", port);
});
