const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const morgan = require("morgan");
const raffleRoutes = require("./routes/raffleRoutes");

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(morgan("dev"));

app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/raffle", raffleRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
