import { Pool } from "pg";
import { getDb } from "../db";

import type Agent from "@interfaces/agent.interface";
import type AuditLog from "@interfaces/audit-log.interface";

// Constants for table names
const AGENT_TABLE = "agents";
const AUDIT_TABLE = "agent_audit_log";

/**
 * Service for managing agent records and audit logs in a PostgreSQL database.
 *
 * @remarks
 * Implements the singleton pattern to ensure a single shared database connection.
 */
export default class NecoService {
  /** Singleton instance of the service */
  private static instance: NecoService;

  /**
   * Private constructor to prevent direct instantiation.
   *
   * @param pool - A configured PostgreSQL connection pool.
   */
  private constructor(private readonly pool: Pool) {}

  /**
   * Retrieves the singleton instance of the service.
   *
   * @returns A promise that resolves to the `NecoService` instance.
   */
  static async getInstance(): Promise<NecoService> {
    if (!NecoService.instance) {
      const pool = await getDb();
      NecoService.instance = new NecoService(pool);
    }
    return NecoService.instance;
  }

  /**
   * Fetches a single agent by Discord ID.
   *
   * @param id - The Discord user ID.
   * @returns A promise resolving to the `Agent` object if found, otherwise `null`.
   */
  async getAgent(id: string): Promise<Agent | null> {
    const sql = `SELECT * FROM ${AGENT_TABLE} WHERE id = $1`;
    const { rows } = await this.pool.query<Agent>(sql, [id]);
    return rows[0] ?? null;
  }

  /**
   * Retrieves all registered agents.
   *
   * @returns A promise resolving to an array of `Agent` objects.
   */
  async getAllAgents(): Promise<Agent[]> {
    const sql = `SELECT * FROM ${AGENT_TABLE}`;
    const { rows } = await this.pool.query<Agent>(sql);
    return rows;
  }

  /**
   * Checks whether an agent exists in the database.
   *
   * @param id - The Discord user ID.
   * @returns A promise resolving to `true` if the agent exists, otherwise `false`.
   */
  async agentExists(id: string): Promise<boolean> {
    const sql = `SELECT 1 FROM ${AGENT_TABLE} WHERE id = $1`;
    return await this.handleQuery(sql, [id]);
  }

  /**
   * Creates a new agent record with the given Discord ID.
   *
   * @param id - The Discord user ID.
   * @returns A promise resolving to the created `Agent`, or `null` on failure.
   */
  async createAgent(id: string): Promise<Agent | null> {
    const sql = `INSERT INTO ${AGENT_TABLE} (id) VALUES ($1) RETURNING *`;
    const { rows } = await this.pool.query<Agent>(sql, [id]);
    return rows[0] ?? null;
  }

  /**
   * Sets or updates an agent's balance.
   *
   * @param id - The Discord user ID.
   * @param balance - The balance value to set.
   * @returns A promise resolving to `true` if the operation was successful.
   */
  async setAgentBalance(id: string, balance: number): Promise<boolean> {
    const sql = `
      INSERT INTO ${AGENT_TABLE} (id, balance)
      VALUES ($1, $2)
      ON CONFLICT (id) DO UPDATE SET balance = EXCLUDED.balance
    `;
    return await this.handleQuery(sql, [id, balance]);
  }

  /**
   * Increases an agent's balance by a specified amount.
   *
   * @param id - The Discord user ID.
   * @param amount - The amount to add to the balance.
   * @returns A promise resolving to `true` if the operation was successful.
   */
  async increaseAgentBalance(id: string, amount: number): Promise<boolean> {
    const sql = `
    INSERT INTO ${AGENT_TABLE} (id, balance)
    VALUES ($1, $2)
    ON CONFLICT (id) DO UPDATE
    SET balance = agents.balance + EXCLUDED.balance
  `;
    return await this.handleQuery(sql, [id, amount]);
  }

  /**
   * Decreases an agent's balance by a specified amount.
   *
   * @param id - The Discord user ID.
   * @param amount - The amount to subtract from the balance.
   * @returns A promise resolving to `true` if the operation was successful.
   */
  async decreaseAgentBalance(id: string, amount: number): Promise<boolean> {
    const sql = `
      INSERT INTO ${AGENT_TABLE} (id, balance)
      VALUES ($1, $2)
      ON CONFLICT (id) DO UPDATE
      SET balance = balance - EXCLUDED.balance
    `;
    return await this.handleQuery(sql, [id, amount]);
  }

  /**
   * Sets or updates an agent's shame value.
   *
   * @param id - The Discord user ID.
   * @param shame - The shame value to set.
   * @returns A promise resolving to `true` if the operation was successful.
   */
  async setAgentShame(id: string, shame: number): Promise<boolean> {
    const sql = `
      INSERT INTO ${AGENT_TABLE} (id, shame)
      VALUES ($1, $2)
      ON CONFLICT (id) DO UPDATE SET shame = EXCLUDED.shame
    `;
    return await this.handleQuery(sql, [id, shame]);
  }

  /**
   * Updates an agent's begged state (e.g. for cooldown tracking).
   *
   * @param id - The Discord user ID.
   * @param state - The new begged state.
   * @returns A promise resolving to `true` if the update succeeded.
   */
  async setBeggedState(id: string, state: boolean): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET begged = $1 WHERE id = $2`;
    return await this.handleQuery(sql, [state, id]);
  }

  /**
   * Updates an agent's punishment state.
   *
   * @param id - The Discord user ID.
   * @param state - The new punishment state.
   * @returns A promise resolving to `true` if the update succeeded.
   */
  async setPunishmentState(id: string, state: boolean): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET punished = $1 WHERE id = $2`;
    return await this.handleQuery(sql, [state, id]);
  }

  /**
   * Resets the begged state for all agents (e.g. to clear cooldowns).
   *
   * @returns A promise resolving to `true` if at least one row was updated.
   */
  async resetAllBeggedStates(): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET begged = FALSE`;
    return await this.handleQuery(sql, []);
  }

  /**
   * Resets the balance of all agents to zero.
   *
   * @returns A promise resolving to `true` if at least one row was updated.
   */
  async resetAllBalances(): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET balance = 0`;
    return await this.handleQuery(sql, []);
  }

  /**
   * Logs a field change for an agent in the audit table.
   *
   * @param auditLog - Object containing audit log details.
   * @returns A promise resolving to `true` if the log was inserted.
   */
  async logAudit(auditLog: AuditLog): Promise<boolean> {
    const sql = `
      INSERT INTO ${AUDIT_TABLE}
        (agent_id, changed_field, old_value, new_value, changed_by)
      VALUES
        ($1, $2, $3, $4, $5)
    `;
    return await this.handleQuery(sql, [
      auditLog.targetId,
      auditLog.changedField,
      auditLog.previousValue,
      auditLog.newValue,
      auditLog.authorId,
    ]);
  }

  /**
   * Executes a generic SQL query and checks if it affected any rows.
   *
   * @param sql - The SQL query string.
   * @param params - Parameterized values to safely inject into the query.
   * @returns A promise resolving to `true` if `rowCount > 0`, otherwise `false`.
   * @internal
   */
  private async handleQuery(sql: string, params: any[]): Promise<boolean> {
    const { rowCount } = await this.pool.query(sql, params);
    return (rowCount ?? 0) > 0;
  }
}
