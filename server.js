import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { dbConnection } from "./database/dbConnection.js";
import { bootstrap } from "./src/modules/bootstrap.js";
import { globalError } from "./src/middleware/globalError.js";
import { AppError } from "./src/utils/appError.js";
import { initSocket } from "./src/modules/socket/socket.js";
import dotenv from "dotenv"
import cors from "cors";

dotenv.config()
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  }
});
const port = 3000;

app.use(cors());
app.use(express.json())

app.use('/uploads', express.static('uploads'))
bootstrap(app)

// Initialize Socket.io
initSocket(io);

app.use((req, res, next) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
});
app.use(globalError)

httpServer.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
})