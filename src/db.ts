import mysql, { Connection } from "mysql2/promise";
import "dotenv/config";

let necoClient: Connection | null = null;

export async function getDb(): Promise<Connection> {
  if (!necoClient) {
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DATABASE) {
      throw new Error("Missing required database environment variables");
    }

    necoClient = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DATABASE,
    });

    console.log("Connected to DATABASE");
  }

  return necoClient;
}
