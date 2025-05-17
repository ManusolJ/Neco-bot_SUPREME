import { Connection, ResultSetHeader } from "mysql2/promise";

import type ChaosAgent from "@interfaces/agent.interface";
import { getDb } from "src/db";

const AGENT_TABLE = "chaos_agents";

export default class NecoService {
  private static instance: NecoService;
  private con: Connection;

  private constructor(con: Connection) {
    this.con = con;
  }

  static async getInstance(): Promise<NecoService> {
    if (!NecoService.instance) {
      const connection = await getDb();
      NecoService.instance = new NecoService(connection);
    }
    return NecoService.instance;
  }

  async getAgent(id: string): Promise<ChaosAgent | null> {
    const sql = `SELECT * FROM ${AGENT_TABLE} WHERE id = ?`;
    const [rows] = await this.con.execute<ChaosAgent[]>(sql, [id]);

    if (!rows || rows.length === 0) return null;

    return rows[0];
  }

  async getAllAgents(): Promise<ChaosAgent[] | null> {
    const agents: ChaosAgent[] = [];
    const sql = `SELECT * FROM ${AGENT_TABLE}`;

    const [rows] = await this.con.query<ChaosAgent[]>(sql);

    if (!rows || rows.length === 0) return null;

    rows.forEach((row) => agents.push(row));

    return agents;
  }

  async createAgent(id: string): Promise<boolean> {
    const sql = `INSERT INTO ${AGENT_TABLE} (id) VALUES (?)`;
    const [result] = await this.con.execute<ResultSetHeader>(sql, [id]);

    return result.affectedRows !== 0;
  }

  async manipulateAgentNecoins(id: string, points: number): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET necoins = ? WHERE id = ?`;
    const [result] = await this.con.execute<ResultSetHeader>(sql, [points, id]);

    return result.affectedRows !== 0;
  }

  async manipulateAgentShame(id: string, shame: number): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET shame_counter = ? WHERE id = ?`;
    const [result] = await this.con.execute<ResultSetHeader>(sql, [shame, id]);

    return result.affectedRows !== 0;
  }

  async manipulateAgentBegState(id: string, state: boolean): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET beg_used = ? WHERE id = ?`;
    const [result] = await this.con.execute<ResultSetHeader>(sql, [state, id]);

    return result.affectedRows !== 0;
  }

  async manipulateAgentRoleState(id: string, state: boolean): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET role_imposed = ? WHERE id = ?`;
    const [result] = await this.con.execute<ResultSetHeader>(sql, [state, id]);

    return result.affectedRows !== 0;
  }

  async resetBegState(): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET beg_used = FALSE`;
    const [result] = await this.con.execute<ResultSetHeader>(sql);

    return result.affectedRows !== 0;
  }

  async resetGlobalChaos(): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET necoins = 0`;
    const [result] = await this.con.execute<ResultSetHeader>(sql);

    return result.affectedRows !== 0;
  }
}
