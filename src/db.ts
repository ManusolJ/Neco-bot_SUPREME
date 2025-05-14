import mysql, { Connection } from "mysql2/promise";
import "dotenv/config";

const necoClient: Connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DATABASE,
});

console.log("Connected to DATABASE");

export default necoClient;
