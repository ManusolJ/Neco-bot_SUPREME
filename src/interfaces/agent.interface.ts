export default interface ChaosAgent {
  id: string;
  balance: number;
  shame: number;
  begged: boolean;
  punished: boolean;
  created_at?: Date;
  last_updated?: Date;
}
