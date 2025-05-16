import { RowDataPacket } from "mysql2";

export default interface ChaosAgent extends RowDataPacket {
  id: string;
  necoins: number;
  shame: number;
  begged: boolean;
  punished: boolean;
}
