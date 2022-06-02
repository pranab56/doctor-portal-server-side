const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require('jsonwebtoken');
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


function jwtVerified(req,res,next){
  const authorization=req.headers.authorization;
  if(!authorization){
    return res.status(401).send({message: "UnAuthorization"})
  }
  const token=authorization.split(' ')[1]
  jwt.verify(token, process.env.ACCESS_WEB_TOKEN, function(err, decoded) {
   
    if(err){
      return res.status(403).send({message : "forbidden"})}
      req.decoded=decoded;
      next()
  });
 
 
}

async function run() {
  try {
    await client.connect();
    const serviceCollection = client.db("doctor-portal").collection("service");
    const bookingCollection = client.db("doctor-portal").collection("data");
    const userCollection = client.db("doctor-portal").collection("users");
    const doctorCollection = client.db("doctor-portal").collection("doctors");

    const verifyIdAdmin=async(req,res,next)=>{
      const requester=req.decoded.email;
      const requestAccount=await userCollection.findOne({email:requester});
      if(requestAccount.Role === "Admin"){
        next()
      }
      else{
        res.status(403).send({message : "forbidden"})
      }
    }

    app.get("/service", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query).project({name:1});
      const service = await cursor.toArray();
      res.send(service);
    });
    
    app.get("/data", jwtVerified, async (req,res)=>{
      const email=req.query.email;
      const decodedEmail=req.decoded.email;
      if(decodedEmail===email){
        const query={email:email}
        const cursor=await bookingCollection.find(query).toArray();
       return res.send(cursor)
      }
        
       
       
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
      //    aituku sudu code
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

    app.get('/users', async(req,res)=>{
      const result=await userCollection.find().toArray();
      res.send(result)
    })

    app.get('/admin/:email', async(req,res)=>{
      const email=req.params.email;
      const user=await userCollection.findOne({email:email});
      const isAdmin=user.Role==='Admin';
      res.send({Admin : isAdmin})
    })
    
    app.put('/users/admin/:email', jwtVerified,verifyIdAdmin, async(req,res)=>{
      const email=req.params.email;
        const filter={email:email};
        const updateDoc = {
          $set: {Role :'Admin'}
        };
        const result=await userCollection.updateOne(filter,updateDoc);
        res.send(result)     
    })



    

    app.put('/users/:email',async(req,res)=>{
      const email=req.params.email;
      const filter={email:email};
      const user=req.body;
      const options = { upsert: true };
      const updateDoc = {
        $set: user
        ,
      };
      const result=await userCollection.updateOne(filter,updateDoc,options);
      const token=jwt.sign({email:email},process.env.ACCESS_WEB_TOKEN,{ expiresIn: '1h' })
      res.send({result,token})
    })

    app.get('/doctors', jwtVerified,verifyIdAdmin, async(req,res)=>{
      const result=await doctorCollection.find().toArray();
      res.send(result)
    })

    app.delete('/doctors/:email',jwtVerified,verifyIdAdmin,async(req,res)=>{
      const email=req.params.email;
      const filter={email:email}
      const result=await doctorCollection.deleteOne(filter);
      res.send(result)
    })


    app.post('/doctors',jwtVerified,verifyIdAdmin,async(req,res)=>{
      const doctor=req.body;
      const result=await doctorCollection.insertOne(doctor);
      res.send(result)
    })

  } finally {
    // await client.close() and finally
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("doctor portal in connected");
});

app.listen(port, () => {
  console.log("database connected", port);
});
