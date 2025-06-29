import { Pool } from "pg";
import "dotenv/config";

let necoPool: Pool | null = null;

export async function getDb(): Promise<Pool> {
  if (!necoPool) {
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DATABASE) {
      throw new Error("Missing required database environment variables");
    }

    necoPool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || "5432"),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DATABASE,
      ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false,
    });

    try {
      await necoPool.query("SELECT NOW()");
      console.log("Connected to PostgreSQL DATABASE");
    } catch (err) {
      console.error("Database connection failed:", err);
      throw err;
    }
  }

  return necoPool;
}
