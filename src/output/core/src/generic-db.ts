export type DatabaseOptions = {
  // firebaseSecret: string
  notionSecret: string;
};

export abstract class GenericDatabaseClass<
  DatabaseResponse,
  DatabasePatchDTO,
  DatabaseQuery,
  DatabaseQueryResponse,
  // DatabaseWebHookOptions,
> {
  private firebaseSecret: string;
  private notionApiHeaders: Record<string, string>;
  abstract notionDatabaseId: string;
  abstract queryRemapFilter(
    filter: Record<string, unknown>
  ): Record<string, unknown>;
  abstract queryRemapSorts(
    sorts: Record<string, string>[]
  ): Record<string, string>[];

  private notionPageApiURL(pageId) {
    return `https://api.notion.com/v1/pages/${pageId}`;
  }

  private notionDatabaseQueryURL() {
    return `https://api.notion.com/v1/databases/${this.notionDatabaseId}/query`;
  }

  constructor(opts: DatabaseOptions) {
    // this.firebaseSecret = opts.firebaseSecret;
    this.notionApiHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.notionSecret}`,
      "Notion-Version": "2022-06-28",
    };
  }

  /**
   * Query the Notion database
   *
   * @param query - Query options
   * @returns - Query results. Use your custom DTO type to parse the data.
   *
   * @example
   * const res = await db.query({
   *   filter: {
   *     and: [
   *       { city: { equals: 'New York' } },
   *       { type: { equals: 'Irish Pub' } },
   *       { cost: { contains: 'free entrance' } },
   *     ]
   *   },
   *   sorts: [
   *     { property: 'name', direction: 'ascending' },
   *     { timestamp: 'last_edited_time', direction: 'descending' },
   *   ]
   * })
   *
   * const pages = res.results.map((r) => new MyDatabaseResponseDTO(r))
   */
  async query(query: DatabaseQuery): Promise<DatabaseQueryResponse> {
    const notionQuery = {
      ...query,
      filter: this.queryRemapFilter(query["filter"]),
      sorts: this.queryRemapSorts(query["sorts"]),
    };
    // console.log('Querying Notion database with:', JSON.stringify(notionQuery, null, 2))
    const res = await fetch(this.notionDatabaseQueryURL(), {
      method: "POST",
      headers: this.notionApiHeaders,
      body: JSON.stringify(notionQuery),
    });

    if (!res.ok) {
      throw new Error(
        `Failed to query database: ${res.status} ${res.statusText}`
      );
    }

    return (await res.json()) as DatabaseQueryResponse;
  }

  /**
   * Get a page from the Notion database
   * @param id - Notion page id
   * @returns - Notion page data with properties. Use your custom DTO type to parse the data.
   *
   * @example
   * const pageResponse = await db.getPage('70b2b25b7f434306b5089486de5efced')
   * const page = new MyDatabaseResponseDTO(pageResponse)
   *
   * console.log(page.properties.title)
   */
  // TODO: implement rate limiting
  // https://github.com/xavi-/node-simple-rate-limiter
  async getPage(id: string): Promise<DatabaseResponse> {
    const res = await fetch(this.notionPageApiURL(id), {
      method: "GET",
      headers: this.notionApiHeaders,
    });

    if (!res.ok) {
      throw new Error(
        `Failed to get page properties: ${res.status} ${res.statusText}`
      );
    }

    return (await res.json()) as DatabaseResponse;
  }

  /**
   * Update a page in the Notion database
   * @param id - Notion page id
   * @param patch - Patch data. Use your custom DTO type to create the patch data.
   *
   * @example
   * const patch = new MyDatabasePatchDTO({
   *  title: 'New title',
   * })
   *
   * await db.updatePage('70b2b25b7f434306b5089486de5efced', patch)
   */
  // TODO: implement rate limiting
  // https://github.com/xavi-/node-simple-rate-limiter
  async updatePage(id: string, patch: DatabasePatchDTO) {
    const res = await fetch(this.notionPageApiURL(id), {
      method: "PATCH",
      headers: this.notionApiHeaders,
      body: JSON.stringify(patch["data"]),
    });

    if (!res.ok) {
      throw new Error(
        `Failed to update page properties: ${res.status} ${res.statusText}`
      );
    }
  }

  // TODO: This is NoteMate Logic. Move it there!
  /**
   * Register a webhook for the updates to the database
   *
   * Supported update triggers:
   * - prop-updated: Triggered when a specific property in a database page is updated
   * - page-updated: Triggered when a page is updated in the database
   * - page-added: Triggered when a page is added to the database
   * - page-removed: Triggered when a page is removed from the database
   *
   * @param options - Webhook options
   * @param url - Webhook url
   * @returns - Function to unregister the webhook
   *
   * @example
   * const unregister = db.registerWebhook({ trigger: 'prop-updated', properties: ['title'] }, 'https://example.com/webhook')
   */
  // registerWebhook(options: DatabaseWebHookOptions, url: string): () => void {
  //   // TODO: implement?
  //   // Send API request to register webhook url in our backend
  //   return () => {
  //     // TODO: implement
  //     // Send API request to unregister webhook url in our backend
  //   }
  // }

  /**
   * Listen for changes of page properties in the database
   *
   * @param query - Query options
   * @param cb - Callback with query snapshot
   * @returns - Function to stop listening
   */
  // onQuerySnapshot(query: DatabaseQuery, cb: (snapshot: DatabaseQueryResponse) => void): () => void {
  //   // TODO: implement?
  //   // Start listening.
  //   // Use the same API mechanism as registerWebhook?
  //   // Map Notion query to Firebase query and call cb with snapshot from our Firebase function?
  //   return () => {
  //     // TODO: implement
  //     // Stop listening
  //   }
  // }
}
