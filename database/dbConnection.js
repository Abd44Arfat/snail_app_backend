import { connect } from "mongoose";

export const dbConnection =connect("mongodb://localhost:27017/taxi_app").then(() => {
    console.log("Database connected");
})