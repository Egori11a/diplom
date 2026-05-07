export interface Queryable {
  query<Result = unknown>(queryText: string, values?: unknown[]): Promise<{ rows: Result[]; rowCount: number | null }>;
}
