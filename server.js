const express = require('express');
const app = express();
const PORT = 8080;

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.get("/other", (req, res) => {
    res.send("Hello Again!");
});

app.listen(PORT, () =>{
    console.log("Now listening on port" + PORT);

});