import { connect } from "mongoose";

export const dbConnection = connect("mongodb://127.0.0.1:27017/taxi_app").then(() => {
    console.log("Database connected");
})