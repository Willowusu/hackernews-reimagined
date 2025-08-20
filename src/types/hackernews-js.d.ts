declare module "hackernews-js" {
  export class HNClient {
    constructor(config?: { concurrency?: number; fetch?: typeof fetch });
    getListPage(
      type: string,
      page: number,
      pageSize?: number
    ): Promise<{ items: any[]; total: number }>;
    getStoryWithComments(
      id: number,
      opts?: { maxDepth?: number; maxComments?: number }
    ): Promise<any>;
    toDate(unixTime: number): Date;
  }
}
