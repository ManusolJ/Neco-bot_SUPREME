export default interface AuditLog {
  authorId: string;
  targetId: string;
  changedField: string;
  previousValue: string;
  newValue: string;
}
