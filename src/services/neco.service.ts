import { Pool } from "pg";
import { getDb } from "../db";
import type Agent from "@interfaces/agent.interface";

// Database table name constant
const AGENT_TABLE = "agents";

/**
 * Service for managing agent data in PostgreSQL database
 * Implements singleton pattern for database connection sharing
 */
export default class NecoService {
  private static instance: NecoService;
  private pool: Pool;

  private constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Singleton accessor ensuring single database pool instance
   *
   * @returns Shared service instance
   */
  static async getInstance(): Promise<NecoService> {
    if (!NecoService.instance) {
      // Initialize with shared connection pool
      const pool = await getDb();
      NecoService.instance = new NecoService(pool);
    }
    return NecoService.instance;
  }

  /**
   * Fetches single agent by ID
   *
   * @param id Agent's Discord ID
   * @returns Agent object or null if not found
   */
  async getAgent(id: string): Promise<Agent | null> {
    const sql = `SELECT * FROM ${AGENT_TABLE} WHERE id = $1`;
    const { rows } = await this.pool.query<Agent>(sql, [id]);
    return rows[0] || null; // Return first match or null
  }

  /**
   * Fetches all registered agents
   *
   * @returns Array of agents or null if empty
   */
  async getAllAgents(): Promise<Agent[] | null> {
    const sql = `SELECT * FROM ${AGENT_TABLE}`;
    const { rows } = await this.pool.query<Agent>(sql);
    return rows.length ? rows : null; // Null for empty results
  }

  /**
   * Checks agent existence by ID
   *
   * @param id Agent's Discord ID
   * @returns Boolean indicating existence
   */
  async checkAgentExists(id: string): Promise<boolean> {
    const sql = `SELECT 1 FROM ${AGENT_TABLE} WHERE id = $1`;
    const { rows } = await this.pool.query(sql, [id]);
    return rows ? rows.length > 0 : false;
  }

  /**
   * Creates new agent with initial state
   *
   * @param id Agent's Discord ID
   * @returns Success status
   */
  async createAgent(id: string): Promise<boolean> {
    const sql = `INSERT INTO ${AGENT_TABLE} (id) VALUES ($1)`;
    const { rowCount } = await this.pool.query(sql, [id]);
    return rowCount ? rowCount > 0 : false;
  }

  /**
   * Updates agent's balance (currency system)
   *
   * @param id Agent's Discord ID
   * @param points New balance value
   * @returns Update success status
   */
  async manipulateAgentBalance(id: string, points: number): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET balance = $1 WHERE id = $2`;
    const { rowCount } = await this.pool.query(sql, [points, id]);
    return rowCount ? rowCount > 0 : false;
  }

  /**
   * Updates agent's shame level
   *
   * @param id Agent's Discord ID
   * @param shame New shame value
   * @returns Update success status
   */
  async manipulateAgentShame(id: string, shame: number): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET shame = $1 WHERE id = $2`;
    const { rowCount } = await this.pool.query(sql, [shame, id]);
    return rowCount ? rowCount > 0 : false;
  }

  /**
   * Toggles agent's begging state (cooldown)
   *
   * @param id Agent's Discord ID
   * @param state New begged state
   * @returns Update success status
   */
  async manipulateAgentBegState(id: string, state: boolean): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET begged = $1 WHERE id = $2`;
    const { rowCount } = await this.pool.query(sql, [state, id]);
    return rowCount ? rowCount > 0 : false;
  }

  /**
   * Toggles agent's punishment state
   *
   * @param id Agent's Discord ID
   * @param state New punished state
   * @returns Update success status
   */
  async manipulateAgentPunishmentState(id: string, state: boolean): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET punished = $1 WHERE id = $2`;
    const { rowCount } = await this.pool.query(sql, [state, id]);
    return rowCount ? rowCount > 0 : false;
  }

  /**
   * Resets all agents' begged state (global cooldown reset)
   *
   * @returns Update success status
   */
  async resetBegState(): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET begged = FALSE`;
    const { rowCount } = await this.pool.query(sql);
    return rowCount ? rowCount > 0 : false;
  }

  /**
   * Resets all agents' balances (global economy reset)
   *
   * @returns Update success status
   */
  async resetGlobalChaos(): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET balance = 0`;
    const { rowCount } = await this.pool.query(sql);
    return rowCount ? rowCount > 0 : false;
  }
}
