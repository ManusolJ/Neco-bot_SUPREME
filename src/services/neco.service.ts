import type { Pool } from "pg";
import type Agent from "@interfaces/agent.interface";
import { getDb } from "../db";

const AGENT_TABLE = "agents";

export default class NecoService {
  private static instance: NecoService;
  private pool: Pool;

  private constructor(pool: Pool) {
    this.pool = pool;
  }

  static async getInstance(): Promise<NecoService> {
    if (!NecoService.instance) {
      const pool = await getDb();
      NecoService.instance = new NecoService(pool);
    }
    return NecoService.instance;
  }

  async getAgent(id: string): Promise<Agent | null> {
    const sql = `SELECT * FROM ${AGENT_TABLE} WHERE id = $1`;
    const { rows } = await this.pool.query<Agent>(sql, [id]);
    return rows[0] || null;
  }

  async getAllAgents(): Promise<Agent[] | null> {
    const sql = `SELECT * FROM ${AGENT_TABLE}`;
    const { rows } = await this.pool.query<Agent>(sql);
    return rows.length ? rows : null;
  }

  async checkAgentExists(id: string): Promise<boolean> {
    const sql = `SELECT 1 FROM ${AGENT_TABLE} WHERE id = $1`;
    const { rows } = await this.pool.query(sql, [id]);
    return rows ? rows.length > 0 : false;
  }

  async createAgent(id: string): Promise<boolean> {
    const sql = `INSERT INTO ${AGENT_TABLE} (id) VALUES ($1)`;
    const { rowCount } = await this.pool.query(sql, [id]);
    return rowCount ? rowCount > 0 : false;
  }

  async manipulateAgentBalance(id: string, points: number): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET balance = $1 WHERE id = $2`;
    const { rowCount } = await this.pool.query(sql, [points, id]);
    return rowCount ? rowCount > 0 : false;
  }

  async manipulateAgentShame(id: string, shame: number): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET shame = $1 WHERE id = $2`;
    const { rowCount } = await this.pool.query(sql, [shame, id]);
    return rowCount ? rowCount > 0 : false;
  }

  async manipulateAgentBegState(id: string, state: boolean): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET begged = $1 WHERE id = $2`;
    const { rowCount } = await this.pool.query(sql, [state, id]);
    return rowCount ? rowCount > 0 : false;
  }

  async manipulateAgentPunishmentState(id: string, state: boolean): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET punished = $1 WHERE id = $2`;
    const { rowCount } = await this.pool.query(sql, [state, id]);
    return rowCount ? rowCount > 0 : false;
  }

  async resetBegState(): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET begged = FALSE`;
    const { rowCount } = await this.pool.query(sql);
    return rowCount ? rowCount > 0 : false;
  }

  async resetGlobalChaos(): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET balance = 0`;
    const { rowCount } = await this.pool.query(sql);
    return rowCount ? rowCount > 0 : false;
  }
}
