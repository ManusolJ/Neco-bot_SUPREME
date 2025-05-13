import mysql from "mysql2/promise";
import "dotenv/config";

const necoClient = await mysql.createConnection({
  host: process.env.CONFIG.DB_HOST,
  user: process.env.CONFIG.DB_USER,
  password: process.env.CONFIG.DB_PASSWORD,
  database: process.env.CONFIG.DATABASE,
});

export default async function connectToDB() {
  await necoClient.connect();
  console.log("Connected to DATABASE");
}

export { necoClient };
