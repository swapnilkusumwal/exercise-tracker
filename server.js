const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const shortid = require("shortid");
const cors = require("cors");
const mongoose = require("mongoose");

mongoose.connect(
  process.env.MONGO_URL || "mongodb://localhost/exercise-track",
  { useNewUrlParser: true },
  { useUnifiedTopology: true }
);

const Schema = mongoose.Schema;
app.use(cors());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const exerciseSchema = new Schema({
  _id: {
    type: String,
    index: true,
    default: shortid.generate
  },
  username: { type: String, unique: true },
  log: [
    {
      description: { type: String },
      duration: { type: Number },
      date: { type: String }
    }
  ]
});

const exercise = mongoose.model("exercise", exerciseSchema);

app.post("/api/exercise/new-user/", function(req, res, next) {
  // var ob;
  var uname = req.body.username;
  // var check = 0;
  exercise.find({ username: uname }, (err, data) => {
    if (err) {
      throw err;
    }
    if (data.length) {
      res.json("username already taken");
    } else {
      var obj = new exercise({ username: uname, exercise: [] });
      obj.save((err, data) => {
        if (err) {
          console.log("ins");
          throw err;
        } else {
          res.json({ username: uname, _id: data._id });
        }
      });
    }
  });
});

app.post("/api/exercise/add", function(req, res) {
  let uid = req.body.userId;
  let desc = req.body.description;
  let dur = req.body.duration;
  let date = req.body.date;
  if (isNaN(Date.parse(date))) date = new Date().toISOString().substr(0, 10);

  if (dur === null || desc === null) res.send("Please enter valid things");
  if (date === "" || date === null) {
    date = new Date().toISOString().substr(0, 10);
  }
  exercise.findById(uid).then(data => {
    if (data === null) {
      res.send("unknown _id");
    }
    var obj = {
      description: desc,
      duration: dur,
      date: date
    };
    if (date === null || date === "") {
      // console.log("YO");
      res.send("Cast to Date failed for value date at path date");
    }
    data.log.push(obj);
    data.save().then(data1 => {
      res.json({
        username: data.username.toString(),
        description: desc.toString(),
        duration: parseInt(dur),
        _id: data._id.toString(),
        date: new Date(date).toDateString().toString()
      });
    });
  });
});

app.get("/api/exercise/users", function(req, res) {
  exercise.find({}, { _id: 1, username: 1 }, function(err, data) {
    if (err) throw err;
    else res.json(data);
  });
});

app.get("/api/exercise/log", (req, res) => {
  console.log("connected");
  let uid = req.query.userId;
  let from = req.query.from;
  let to = req.query.to;
  let limit = req.query.limit;
  console.log(req.query);
  exercise.findById(uid).then(data => {
    if (data == null) {
      res.json("Unknown userId");
    } else {
      var obj = data.log;
      obj.sort((a, b) => b.date < a.date);
      if (from) {
        for (var i = obj.length - 1; i >= 0; i--) {
          if (obj[i].date < from) {
            obj = obj.slice(i + 1);
            break;
          }
        }
      }
      // res.send(obj);
      if (to) {
        for (var i = 0; i < obj.length; i++) {
          if (obj[i].date > to) {
            obj = obj.slice(0, i);
            break;
          }
        }
      }
      console.log(obj.length);
      if (limit < obj.length) {
        obj = obj.slice(0, limit);
      }
      res.json({
        _id: data._id,
        username: data.username,
        count: data.log.length,
        log: obj
      });
    }
  });
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
