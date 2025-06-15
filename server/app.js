import express from "express";
import bodyParser from "body-parser";
import routes from "./routes/index.js";

const app = express();
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false })); // parse form data

routes(app);

export default app;
