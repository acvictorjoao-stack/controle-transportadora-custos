type Row = Record<string, unknown>;

interface QueryResult {
  data: Row[] | null;
  error: {code: string; message: string} | null;
  count: number | null;
}

export interface InMemoryDatabase {
  tables: Record<string, Row[]>;
  /** role_id → códigos de permissão (role_permissions ⋈ permissions). */
  rolePermissions: Record<string, string[]>;
  portalOwnerIds?: string[];
}

const NOT_SINGLE_ROW = {
  code: 'PGRST116',
  message: 'JSON object requested, multiple (or no) rows returned',
};

/**
 * Builder com a semântica de filtros do PostgREST usada pelas queries.
 * Não aplica RLS: o que ele prova é o isolamento feito pela própria aplicação.
 */
class InMemoryQuery implements PromiseLike<QueryResult> {
  private readonly filters: Array<(row: Row) => boolean> = [];
  private updatePayload: Row | null = null;
  private inserted: Row[] | null = null;
  private returning = false;
  private headCount = false;
  private limitCount: number | null = null;

  constructor(private readonly rows: Row[]) {}

  select(_columns?: string, options?: {count?: 'exact'; head?: boolean}) {
    if (this.updatePayload || this.inserted) this.returning = true;
    if (options?.head) this.headCount = true;
    return this;
  }

  update(payload: Row) {
    this.updatePayload = payload;
    return this;
  }

  insert(payload: Row | Row[]) {
    const now = new Date().toISOString();
    this.inserted = (Array.isArray(payload) ? payload : [payload]).map((row) => ({
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
      deleted_at: null,
      ...row,
    }));
    this.rows.push(...this.inserted);
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  is(column: string, value: null) {
    this.filters.push((row) => (row[column] ?? null) === value);
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  order() {
    return this;
  }

  private execute(): QueryResult {
    if (this.inserted) {
      return {
        data: this.returning ? this.inserted.map((row) => ({...row})) : null,
        error: null,
        count: null,
      };
    }

    const matched = this.rows.filter((row) => this.filters.every((test) => test(row)));

    if (this.updatePayload) {
      for (const row of matched) Object.assign(row, this.updatePayload);
      return {
        data: this.returning ? matched.map((row) => ({...row})) : null,
        error: null,
        count: null,
      };
    }

    const limited = this.limitCount === null ? matched : matched.slice(0, this.limitCount);
    if (this.headCount) return {data: null, error: null, count: limited.length};
    return {data: limited.map((row) => ({...row})), error: null, count: limited.length};
  }

  async maybeSingle() {
    const rows = this.execute().data ?? [];
    if (rows.length > 1) return {data: null, error: NOT_SINGLE_ROW};
    return {data: rows[0] ?? null, error: null};
  }

  async single() {
    const rows = this.execute().data ?? [];
    if (rows.length !== 1) return {data: null, error: NOT_SINGLE_ROW};
    return {data: rows[0], error: null};
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

export function isActiveMember(db: InMemoryDatabase, userId: string, companyId: unknown) {
  return (db.tables.company_members ?? []).find(
    (member) =>
      member.company_id === companyId &&
      member.profile_id === userId &&
      (member.deleted_at ?? null) === null &&
      member.status === 'active',
  );
}

/** Mesmo critério de public.has_company_permission (090), ramo de membro. */
export function memberHasPermission(
  db: InMemoryDatabase,
  userId: string | null,
  companyId: unknown,
  permission: string,
): boolean {
  if (!userId) return false;
  const member = isActiveMember(db, userId, companyId);
  const codes = member ? db.rolePermissions[String(member.role_id)] ?? [] : [];
  return codes.includes(permission);
}

/**
 * Cliente com a sessão de `userId` (null = requisição sem sessão).
 * `storage` é opcional: testes de Storage passam o emulador com a mesma sessão.
 */
export function createInMemorySupabase<TStorage = undefined>(
  db: InMemoryDatabase,
  userId: string | null,
  storage?: TStorage,
) {
  const isOwner = userId !== null && (db.portalOwnerIds ?? []).includes(userId);

  return {
    storage: storage as TStorage,
    auth: {
      async getUser() {
        if (!userId) {
          return {
            data: {user: null},
            error: {name: 'AuthSessionMissingError', message: 'Auth session missing!'},
          };
        }
        return {data: {user: {id: userId}}, error: null};
      },
    },

    from(table: string) {
      db.tables[table] ??= [];
      return new InMemoryQuery(db.tables[table]);
    },

    async rpc(fn: string, args: Record<string, unknown> = {}) {
      switch (fn) {
        case 'is_portal_owner':
          return {data: isOwner, error: null};
        case 'get_my_portal_role':
          return {data: isOwner ? 'OWNER' : null, error: null};
        case 'has_company_permission':
          return {
            data: memberHasPermission(
              db,
              userId,
              args.p_company_id,
              String(args.p_permission_code),
            ),
            error: null,
          };
        default:
          return {data: null, error: {code: '42883', message: `rpc ${fn} não emulada`}};
      }
    },
  };
}
