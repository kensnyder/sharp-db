import Db from './Db/Db';
import { Connection, ConnectionConfig, FieldInfo, QueryOptions } from 'mysql';
import { ConnectConfig } from 'ssh2';

export type DbConnectionType = Connection;

export type DbConfigType = ConnectionConfig;

export type SshConfigType = ConnectConfig;

export type EventNameType =
	| 'sshConnect'
	| 'connect'
	| 'sshDisconnect'
	| 'disconnect'
	| 'query'
	| 'select'
	| 'insert'
	| 'update'
	| 'delete'
	| 'startTransaction'
	| 'commit'
	| 'rollback'
	| 'bind'
	| 'dbError';

export type EventSubtypeNameType = string;

export interface DbEventInterface {
	type: EventNameType;
	subtype: EventSubtypeNameType | null;
	target: Db;
	error: Error | null;
	data: any;
}

export type ColumnResultValueType = string | number | boolean;

export type ResultObjectType = Record<string, ColumnResultValueType>;

export type MySqlFieldsType = FieldInfo;

export interface SqlOptionsInterface extends QueryOptions {
	bound?: Object;
	values?: Object;
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
		sql: string,
		...variables: BindableType[]
	) => Promise<SelectResponseInterface>;
	selectFirst: (
		sql: string,
		...variables: BindableType[]
	) => Promise<SelectFirstResponseInterface>;
	selectList: (
		sql: string,
		...variables: BindableType[]
	) => Promise<SelectListResponseInterface>;
	selectHash: (
		sql: string,
		...variables: BindableType[]
	) => Promise<SelectHashResponseInterface>;
	selectValue: (
		sql: string,
		...variables: BindableType[]
	) => Promise<SelectValueResponseInterface>;
	insert: (
		sql: string,
		...variables: BindableType[]
	) => Promise<InsertResponseInterface>;
	update: (
		sql: string,
		...variables: BindableType[]
	) => Promise<UpdateResponseInterface>;
	delete: (
		sql: string,
		...variables: BindableType[]
	) => Promise<DeleteResponseInterface>;
}

export type BindableType = string | number | boolean | null;

export type QueryCriteria = Record<string, BindableType | BindableType[]>;

export type EscapeInfixType = '?' | '?%' | '%?' | '%?%';
