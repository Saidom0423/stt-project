import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.send("Backend OK");
});

app.listen(5000, () => {
  console.log("Backend running on http://localhost:5000");
});
