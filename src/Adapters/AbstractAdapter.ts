export default class AbstractAdapter {
  client: any;
  constructor(client: any) {
    this.client = client;
  }
  connect: (callback: (error: Error) => void) => void;
  query: (sql: string, bound: any) => Promise<any>;
  release: () => Promise<void>;
  end: () => Promise<void>;
  destroy: () => Promise<void>;
  escape: (value: any) => string;
  escapeId: (value: string) => string;
}
