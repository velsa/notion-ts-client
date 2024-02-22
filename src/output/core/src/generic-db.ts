import rateLimit from './rate-limit'

export type DatabaseOptions = {
  // firebaseSecret: string
  notionSecret: string
}

export abstract class GenericDatabaseClass<
  DatabaseResponse,
  DatabasePatchDTO extends { data: Record<string, unknown> },
  DatabaseQuery extends {
    filter?: Record<string, unknown>
    sorts?: Record<string, string>[]
  },
  DatabaseQueryResponse,
  // DatabaseWebHookOptions,
> {
  private notionApiHeaders: Record<string, string>
  // Using simple rate limiting (https://github.com/xavi-/node-simple-rate-limiter)
  private rateLimitedFetch = rateLimit.promise(fetch).to(3).per(1000)
  /** @private */
  protected abstract notionDatabaseId: string
  protected abstract queryRemapFilter(filter?: Record<string, unknown>): Record<string, unknown> | undefined
  protected abstract queryRemapSorts(sorts?: Record<string, string>[]): Record<string, string>[] | undefined

  private notionPageApiURL(pageId?: string) {
    return pageId ? `https://api.notion.com/v1/pages/${pageId}` : `https://api.notion.com/v1/pages`
  }

  private notionDatabaseQueryURL() {
    return `https://api.notion.com/v1/databases/${this.notionDatabaseId}/query`
  }

  constructor(opts: DatabaseOptions) {
    if (!opts.notionSecret) {
      throw new Error('Notion secret is required')
    }

    // this.firebaseSecret = opts.firebaseSecret;
    this.notionApiHeaders = {
      Authorization: `Bearer ${opts.notionSecret}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    }
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
      filter: this.queryRemapFilter(query['filter']),
      sorts: this.queryRemapSorts(query['sorts']),
    }
    // console.log('Querying Notion database with:', JSON.stringify(notionQuery, null, 2))
    const res = await this.rateLimitedFetch(this.notionDatabaseQueryURL(), {
      method: 'POST',
      headers: this.notionApiHeaders,
      body: JSON.stringify(notionQuery),
    })

    if (!res.ok) {
      throw new Error(`Failed to query database (${this.notionDatabaseId}): ${res.status} ${res.statusText}`)
    }

    return (await res.json()) as DatabaseQueryResponse
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
  async getPage(id: string): Promise<DatabaseResponse> {
    const res = await this.rateLimitedFetch(this.notionPageApiURL(id), {
      method: 'GET',
      headers: this.notionApiHeaders,
    })

    if (!res.ok) {
      throw new Error(
        `Failed to get page (${id}) properties (database id: ${this.notionDatabaseId}): ${res.status} ${res.statusText}`,
      )
    }

    return (await res.json()) as DatabaseResponse
  }

  /**
   * Update a page in the Notion database
   * @param id - Notion page id
   * @param patch - Patch data. Use your custom DTO type to create the patch data.
   *
   * @example
   * const patch = new MyDatabasePatchDTO({
   *  properties: {
   *    title: 'New title',
   *  }
   * })
   *
   * await db.updatePage('70b2b25b7f434306b5089486de5efced', patch)
   */
  async updatePage(id: string, patch: DatabasePatchDTO) {
    const res = await this.rateLimitedFetch(this.notionPageApiURL(id), {
      method: 'PATCH',
      headers: this.notionApiHeaders,
      body: JSON.stringify(patch['data']),
    })

    if (!res.ok) {
      throw new Error(
        `Failed to update page (${id}) properties (database id: ${this.notionDatabaseId}): ${res.status} ${res.statusText}`,
      )
    }
  }

  /**
   * Create a page in the Notion database
   * @param create - Create data. Use your custom DTO type to create the new page data.
   *
   * @example
   *
   * await db.createPage(new MyDatabasePatchDTO({
   *  properties: {
   *   title: 'New title',
   *  }
   * }))
   */
  async createPage(create: DatabasePatchDTO) {
    console.log(
      'Creating page with:',
      JSON.stringify({
        parent: { database_id: this.notionDatabaseId },
        ...create.data,
      }),
    )

    const res = await this.rateLimitedFetch(this.notionPageApiURL(), {
      method: 'POST',
      headers: this.notionApiHeaders,
      body: JSON.stringify({
        parent: { database_id: this.notionDatabaseId },
        ...create.data,
      }),
    })

    if (!res.ok) {
      throw new Error(`Failed to create page in database (${this.notionDatabaseId}): ${res.status} ${res.statusText}`)
    }
  }

  /**
   * Archive a page in the Notion database.
   * Archived pages are not deleted, but are hidden from the database view.
   * The id of the archived page can not be restored.
   * It is recommended to store the id of the archived page if you plan to restore it later.
   *
   * @param id - Notion page id
   *
   * @example
   *
   * await db.archivePage('70b2b25b7f434306b5089486de5efced')
   */
  async archivePage(id: string) {
    const res = await this.rateLimitedFetch(this.notionPageApiURL(id), {
      method: 'PATCH',
      headers: this.notionApiHeaders,
      body: JSON.stringify({ archived: true }),
    })

    if (!res.ok) {
      throw new Error(
        `Failed to archive page ${id} (database id: ${this.notionDatabaseId}): ${res.status} ${res.statusText}`,
      )
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
