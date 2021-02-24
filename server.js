// import required dependencies
require('dotenv').config({path: __dirname + "/.env"});
const express = require("express");
const app = express();

const fetch = require("node-fetch");

const bodyParser = require("body-parser");
const exphbs = require("express-handlebars");

const { getDate } = require("./utils");
const router = require("./router");

// application setup
app.use(express.static(__dirname + "/public"));
app.use("/", router);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.engine(".hbs", exphbs({extname: ".hbs"}));
app.set("view engine", ".hbs");
app.set("views", `${__dirname}/views`);

// application routes
app.get("/", (req, res) => {
    fetch(`http://localhost:${process.env.PORT}/open-weeks`)
        .then(response => response.json())
        .then(weeks => {
            res.render("index", {
                "title": `Spark Camp ${getDate()}`,
                weeks
            });
        })
        .catch(err => console.error(err));
});

app.post("/", (req, res) => res.json(req.body));

app.get("/apply/camper", (req, res) => {
    fetch(`http://localhost:${process.env.PORT}/open-weeks`)
        .then(response => response.json())
        .then(weeks => {
            res.render("apply", {
                "title": `Camper Application for Spark Camp ${getDate()}`,
                "year": getDate(),
                weeks
            });
        })
        .catch(err => console.error(err));
});

app.get("/apply/updates", (req, res) => {
    res.render("updates", {
        "title": `Get Updates for Spark Camp ${getDate()}`,
        "year": getDate()
    });
});

app.get("/about-us", (req, res) => {
    res.render("about_us", {
        "title": `About Us`
    });
});

app.get("/apply/thank-you", (req, res) => {
    res.render("thank_you_apply", {
        "title": `Thank You – Spark Camp ${getDate()}`,
        "year": getDate()
    });
});

app.get("/updates/thank-you", (req, res) => {
    res.render("thank_you_updates", {
        "title": `Thank You – Spark Camp ${getDate()}`,
        "year": getDate()
    });
});

app.get("/admin", (req, res) => {
    res.render("admin", {
        "title": `Admin – Spark Camp ${getDate()}`,
        "layout": false,
        "year": getDate()
    });
});

app.get("/unsubscribe", (req, res) => {
    res.render("unsubscribe", {
        "title": `Unsubscribe – Spark Camp ${getDate()}`,
        "year": getDate()
    });
});

app.use((error, req, res, next) => {
	console.error(error);
	res.render("error", {
		title: `Help! – Summer Camp ${getDate()}`,
		error: error.message
	})
});

// start application
app.listen(process.env.PORT, () => {
	console.log("server go vroom");
});