export default interface Agent {
  id: string;
  balance: number;
  shame: number;
  begged: boolean;
  punished: boolean;
  heretic: boolean;
  created_at?: Date;
  last_updated?: Date;
}
