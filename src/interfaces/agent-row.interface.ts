import { RowDataPacket } from "mysql2";

export default interface AgentRow extends RowDataPacket {
  id: string;
  chaos: number;
  beg_used: boolean;
  role_imposed: boolean;
  shame_counter: number;
}
