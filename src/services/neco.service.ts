import { Connection, ResultSetHeader } from "mysql2/promise";

import type AgentRow from "@interfaces/agent-row.interface";
import type ChaosAgent from "@interfaces/agent.interface";

import necoClient from "src/db";

const AGENT_TABLE = "chaos_agents";

export default class NecoService {
  private static instance: NecoService;
  private con: Connection;

  private constructor() {
    this.con = necoClient;
  }

  static getInstance(): NecoService {
    if (!NecoService.instance) {
      NecoService.instance = new NecoService();
    }
    return NecoService.instance;
  }

  async getAgent(id: string): Promise<ChaosAgent | null> {
    const sql = `SELECT * FROM ${AGENT_TABLE} WHERE id = ?`;
    const [rows] = await this.con.execute<AgentRow[]>(sql, [id]);

    if (!rows || rows.length === 0) return null;

    return this.mapRowToAgent(rows[0]);
  }

  async getAllAgents(): Promise<ChaosAgent[] | null> {
    const agents: ChaosAgent[] = [];
    const sql = `SELECT * FROM ${AGENT_TABLE}`;

    const [rows] = await this.con.query<AgentRow[]>(sql);

    if (!rows || rows.length === 0) return null;

    rows.forEach((row) => agents.push(this.mapRowToAgent(row)));

    return agents;
  }

  async createAgent(id: string): Promise<boolean> {
    const sql = `INSERT INTO ${AGENT_TABLE} (id) VALUES (?)`;
    const [result] = await this.con.execute<ResultSetHeader>(sql, [id]);

    return result.affectedRows !== 0;
  }

  async manipulateChaos(id: string, points: number): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET chaos = ? WHERE id = ?`;
    const [result] = await this.con.execute<ResultSetHeader>(sql, [points, id]);

    return result.affectedRows !== 0;
  }

  async manipulateShame(id: string, shame: number): Promise<boolean> {
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

  async resetAgentsChaos(): Promise<boolean> {
    const sql = `UPDATE ${AGENT_TABLE} SET chaos = 0`;
    const [result] = await this.con.execute<ResultSetHeader>(sql);

    return result.affectedRows !== 0;
  }

  private mapRowToAgent(row: AgentRow): ChaosAgent {
    return {
      id: row.id,
      chaos: row.chaos,
      begUsed: row.beg_used,
      roleImposed: row.role_imposed,
      ShameCounter: row.shame_counter,
    };
  }
}
