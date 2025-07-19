import { Pool } from "pg";
import { getDb } from "../db";
import type Agent from "@interfaces/agent.interface";

// Database table name constant
const AGENT_TABLE = "agents";

/**
 * Service for managing agent records in a PostgreSQL database.
 *
 * @remarks
 * This class implements the singleton pattern to ensure that only one
 * database connection pool is created and shared across the application.
 */
export default class NecoService {
  /** Singleton instance of the service */
  private static instance: NecoService;
  /** Underlying PostgreSQL connection pool */
  private pool: Pool;

  /**
   * Private constructor to prevent direct instantiation.
   *
   * @param pool - An initialized PostgreSQL Pool instance.
   */

  private constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Retrieves the singleton instance of the service, initializing it if necessary.
   *
   * @returns A promise that resolves to the shared `NecoService` instance.
   */
  static async getInstance(): Promise<NecoService> {
    if (!NecoService.instance) {
      const pool = await getDb();
      NecoService.instance = new NecoService(pool);
    }
    return NecoService.instance;
  }

  /**
   * Fetches a single agent record by its Discord ID.
   *
   * @param id - The unique Discord user ID of the agent.
   * @returns A promise resolving to the `Agent` object if found, or `null` otherwise.
   */
  async getAgent(id: string): Promise<Agent | null> {
    const sql = `SELECT * FROM ${AGENT_TABLE} WHERE id = $1`;
    const { rows } = await this.pool.query<Agent>(sql, [id]);
    return rows[0] || null; // Return first match or null
  }

  /**
   * Retrieves all agents registered in the database.
   *
   * @returns A promise resolving to an array of `Agent` objects,
   * or `null` if no agents exist.
   */
  async getAllAgents(): Promise<Agent[] | null> {
    const sql = `SELECT * FROM ${AGENT_TABLE}`;
    const { rows } = await this.pool.query<Agent>(sql);
    return rows.length ? rows : null; // Null for empty results
  }

  /**
   * Checks whether an agent exists by their Discord ID.
   *
   * @param id - The unique Discord user ID to check.
   * @returns A promise resolving to `true` if the agent exists, `false` otherwise.
   */
  async checkAgentExists(id: string): Promise<boolean> {
    const sql = `SELECT 1 FROM ${AGENT_TABLE} WHERE id = $1`;
    const { rows } = await this.pool.query(sql, [id]);
    return rows ? rows.length > 0 : false;
  }

  /**
   * Creates a new agent record with the specified Discord ID.
   *
   * @param id - The Discord user ID for the new agent.
   * @returns A promise resolving to `true` if insertion succeeded, `false` otherwise.
   */
  async createAgent(id: string): Promise<boolean> {
    const sql = `INSERT INTO ${AGENT_TABLE} (id) VALUES ($1)`;
    const { rowCount } = await this.pool.query(sql, [id]);
    return rowCount ? rowCount > 0 : false;
  }

  /**
   * Updates the agent's currency balance to a new value.
   *
   * @param id - The Discord user ID of the agent.
   * @param points - The new balance to set.
   * @returns A promise resolving to `true` if the update succeeded, `false` otherwise.
   */
  async manipulateAgentBalance(id: string, points: number): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET balance = $1 WHERE id = $2`;
    const { rowCount } = await this.pool.query(sql, [points, id]);
    return rowCount ? rowCount > 0 : false;
  }

  /**
   * Updates the agent's shame level to a new value.
   *
   * @param id - The Discord user ID of the agent.
   * @param shame - The new shame value to set.
   * @returns A promise resolving to `true` if the update succeeded, `false` otherwise.
   */
  async manipulateAgentShame(id: string, shame: number): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET shame = $1 WHERE id = $2`;
    const { rowCount } = await this.pool.query(sql, [shame, id]);
    return rowCount ? rowCount > 0 : false;
  }

  /**
   * Toggles the agent's "begged" state for cooldown management.
   *
   * @param id - The Discord user ID of the agent.
   * @param state - `true` to mark as begged (on cooldown), `false` to clear.
   * @returns A promise resolving to `true` if the update succeeded, `false` otherwise.
   */
  async manipulateAgentBegState(id: string, state: boolean): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET begged = $1 WHERE id = $2`;
    const { rowCount } = await this.pool.query(sql, [state, id]);
    return rowCount ? rowCount > 0 : false;
  }

  /**
   * Toggles the agent's punishment state.
   *
   * @param id - The Discord user ID of the agent.
   * @param state - `true` to punish the agent, `false` to lift punishment.
   * @returns A promise resolving to `true` if the update succeeded, `false` otherwise.
   */
  async manipulateAgentPunishmentState(id: string, state: boolean): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET punished = $1 WHERE id = $2`;
    const { rowCount } = await this.pool.query(sql, [state, id]);
    return rowCount ? rowCount > 0 : false;
  }

  /**
   * Resets the "begged" state for all agents, clearing any cooldowns.
   *
   * @returns A promise resolving to `true` if at least one row was updated, `false` otherwise.
   */
  async resetBegState(): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET begged = FALSE`;
    const { rowCount } = await this.pool.query(sql);
    return rowCount ? rowCount > 0 : false;
  }

  /**
   * Resets the balance for all agents to zero, effectively clearing the economy.
   *
   * @returns A promise resolving to `true` if at least one row was updated, `false` otherwise.
   */
  async resetGlobalChaos(): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET balance = 0`;
    const { rowCount } = await this.pool.query(sql);
    return rowCount ? rowCount > 0 : false;
  }
}
