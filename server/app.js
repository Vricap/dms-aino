import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import routes from "./routes/index.js";

const app = express();
app.use(cors({
  origin: "http://localhost:3000", // change to frontend production URL
  credentials: true,
}));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false })); // parse form data

routes(app);

export default app;
