import type {
  Connection,
  ConnectionConfig,
  FieldInfo,
  MysqlError,
  TypeCast,
} from 'mysql';
import type { ConnectConfig } from 'ssh2';

export type DbConnectionType = Connection;

export type DbConfigType = Partial<ConnectionConfig>;

export type SshConfigType = Partial<ConnectConfig>;

export type SharpDbError = MysqlError & {
  bound: Record<string, any>;
};

export type ColumnResultValueType = string | number | boolean;

export type ResultObjectType = Record<string, ColumnResultValueType>;

export type MySqlFieldsType = FieldInfo;

export type PgFieldsType = {};

export type FieldsType = MySqlFieldsType | PgFieldsType;

export interface SqlOptionsInterface {
  sql?: string;
  bound?: BoundValuesType;
  values?: Record<string, any>;
  timeout?: number | undefined;
  nestTables?: boolean | string;
  typeCast?: TypeCast | undefined;
}

export interface QueryResponseInterface {
  query: string;
  results: ResultObjectType[];
  fields: MySqlFieldsType[];
}

export interface SelectResponseInterface {
  query: string;
  results: ResultObjectType[];
  fields: MySqlFieldsType[];
}

export interface SelectFirstResponseInterface {
  query: string;
  results: ResultObjectType;
  fields: MySqlFieldsType[];
}

export interface SelectValueResponseInterface {
  query: string;
  results: ColumnResultValueType;
  fields: MySqlFieldsType[];
}

export interface SelectListResponseInterface {
  query: string;
  results: ColumnResultValueType[];
  fields: MySqlFieldsType[];
}

export interface SelectHashResponseInterface {
  query: string;
  results: ResultObjectType;
  fields: MySqlFieldsType[];
}

export interface SelectGroupedResponseInterface {
  query: string;
  results: Record<string, ResultObjectType[]>;
  fields: MySqlFieldsType[];
}

export interface SelectIndexedResponseInterface {
  query: string;
  results: Record<string, ResultObjectType>;
  fields: MySqlFieldsType[];
}

export interface SelectExistsResponseInterface {
  query: string;
  results: boolean;
  fields: MySqlFieldsType[];
}

export interface InsertResponseInterface {
  query: string;
  insertId: number | undefined;
  affectedRows: number | undefined;
  changedRows: number | undefined;
}

export interface UpdateResponseInterface {
  query: string;
  affectedRows: number | undefined;
  changedRows: number | undefined;
}

export interface DeleteResponseInterface {
  query: string;
  affectedRows: number | undefined;
  changedRows: number | undefined;
}

export interface SelectOrCreateResponseInterface {
  query: string;
  results: Record<string, ResultObjectType[]>;
  insertId: number | undefined;
  affectedRows: number | undefined;
  changedRows: number | undefined;
  fields: MySqlFieldsType[];
}

export interface ExportSqlResultInterface {
  results: string;
  fields: FieldInfo[];
  query: string;
  affectedRows: number;
  chunks: number;
}

export type ExportSqlConfigType = {
  limit?: number;
  chunkSize?: number;
  discardIds?: boolean;
  truncateTable?: boolean;
  disableForeignKeyChecks?: boolean;
  lockTables?: boolean;
};

export interface TemplatizedInterface {
  select: (
    sql: TemplateStringsArray,
    ...variables: BindableType[]
  ) => Promise<SelectResponseInterface>;
  selectFirst: (
    sql: TemplateStringsArray,
    ...variables: BindableType[]
  ) => Promise<SelectFirstResponseInterface>;
  selectList: (
    sql: TemplateStringsArray,
    ...variables: BindableType[]
  ) => Promise<SelectListResponseInterface>;
  selectHash: (
    sql: TemplateStringsArray,
    ...variables: BindableType[]
  ) => Promise<SelectHashResponseInterface>;
  selectValue: (
    sql: TemplateStringsArray,
    ...variables: BindableType[]
  ) => Promise<SelectValueResponseInterface>;
  insert: (
    sql: TemplateStringsArray,
    ...variables: BindableType[]
  ) => Promise<InsertResponseInterface>;
  update: (
    sql: TemplateStringsArray,
    ...variables: BindableType[]
  ) => Promise<UpdateResponseInterface>;
  delete: (
    sql: TemplateStringsArray,
    ...variables: BindableType[]
  ) => Promise<DeleteResponseInterface>;
}

export type BindableType = string | number | boolean | null;

export type BoundValuesType = BindableType[] | [Record<string, BindableType>];

export type QueryCriteriaType = Record<string, BindableType | BindableType[]>;

export type EscapeInfixType = '?' | '?%' | '%?' | '%?%';
