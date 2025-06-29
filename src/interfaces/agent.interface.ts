import { RowDataPacket } from "mysql2";

export default interface ChaosAgent extends RowDataPacket {
  id: string;
  balance: number;
  shame: number;
  begged: boolean;
  punished: boolean;
}
