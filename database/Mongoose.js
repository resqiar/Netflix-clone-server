const mongoose = require('mongoose');

const conURL = process.env.MONGODB_CON

mongoose
  .connect(conURL, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  }).then(() => {
    console.log("CONNECTED TO DATABASE");
  }).catch((e) => {
    console.log("Problem connecting mongoose to the database...", e);
  });
