/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AppendBlockChildrenParameters,
  BlockObjectRequest,
  BlockObjectResponse,
  CreatePageBodyParameters,
  ListBlockChildrenQueryParameters,
  ListBlockChildrenResponse,
} from '../types/notion-api.types'
import { notionDatabaseQueryURL, notionPageApiURL, notionPageContentApiURL } from './notion-urls'
import pThrottle from './p-throttle'

export type DatabaseOptions = {
  // firebaseSecret: string
  notionSecret: string
}

export type BlockObjectResponseWithChildren = BlockObjectResponse & { children?: BlockObjectResponseWithChildren[] }

// Using simple rate limiting (https://github.com/xavi-/node-simple-rate-limiter)
// private rateLimitedFetch = rateLimit.promise(fetch).to(3).per(1000)
const rateLimitedFetch = pThrottle({
  // Notion API rate limit is 3 requests per second,
  // we make it 2 to be on a safe side
  limit: 2,
  interval: 1000,
  onDelay: () => {
    console.log('Fetch reached interval limit, call is delayed')
  },
})(fetch)

export abstract class GenericDatabaseClass<
  DatabaseResponse,
  DatabasePatchDTO extends { __data: Record<string, unknown> },
  DatabaseQuery extends {
    filter?: Record<string, unknown>
    sorts?: Record<string, string>[]
  },
  DatabaseQueryResponse,
  DatabaseDTOProperties extends string,
  // DatabaseWebHookOptions,
> {
  private notionApiHeaders: Record<string, string>

  /** @private */
  protected abstract notionDatabaseId: string
  protected abstract queryRemapFilter(filter?: Record<string, unknown>): Record<string, unknown> | undefined
  protected abstract queryRemapSorts(
    sorts?: Record<string, string | undefined>[],
  ): Record<string, string | undefined>[] | undefined
  protected abstract queryRemapFilterProperties(filterProps?: string[]): string[] | undefined

  constructor(opts: DatabaseOptions) {
    if (!opts.notionSecret) {
      throw new Error('Notion secret is required')
    }

    // this.firebaseSecret = opts.firebaseSecret;
    this.notionApiHeaders = {
      Authorization: `Bearer ${opts.notionSecret}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
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
  async query(query: DatabaseQuery, filterProps?: DatabaseDTOProperties[]): Promise<DatabaseQueryResponse> {
    const notionQuery = {
      ...query,
      filter: this.queryRemapFilter(query['filter']),
      sorts: this.queryRemapSorts(query['sorts']),
    }
    // console.log('Querying Notion database with:', JSON.stringify(notionQuery, null, 2))
    const res: any = await rateLimitedFetch(
      notionDatabaseQueryURL(this.notionDatabaseId, this.queryRemapFilterProperties(filterProps)),
      {
        method: 'POST',
        headers: this.notionApiHeaders,
        body: JSON.stringify(notionQuery),
      },
    )

    if (!res.ok) {
      console.error(await res.json())
      throw new Error(`Failed to query database (${this.notionDatabaseId}): ${res.status} ${res.statusText}`)
    }

    return await res.json()
  }

  /**
   * Get a page from the Notion database
   *
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
    const res: any = await rateLimitedFetch(notionPageApiURL(id), {
      method: 'GET',
      headers: this.notionApiHeaders,
    })

    if (!res.ok) {
      console.error(await res.json())
      throw new Error(
        `Failed to get page (${id}) properties (database id: ${this.notionDatabaseId}): ${res.status} ${res.statusText}`,
      )
    }

    return await res.json()
  }

  /**
   * Update a page in the Notion database
   *
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
  async updatePage(id: string, patch: DatabasePatchDTO): Promise<DatabaseResponse> {
    const res: any = await rateLimitedFetch(notionPageApiURL(id), {
      method: 'PATCH',
      headers: this.notionApiHeaders,
      body: JSON.stringify(patch.__data),
    })

    if (!res.ok) {
      console.error(await res.json())
      throw new Error(
        `Failed to update page (${id}) properties (database id: ${this.notionDatabaseId}): ${res.status} ${res.statusText}`,
      )
    }

    return await res.json()
  }

  /**
   * Create a page in the Notion database
   *
   * @param meta - Page metadata and properties. Use your custom PatchDTO.
   * @param content - Page content – Notion blocks. See Notion API documentation for the block format.
   *
   * @example
   *
   * const meta = new MyDatabasePatchDTO({
   *  properties: {
   *   title: 'New page',
   *  }
   * })
   *
   * await db.createPage(meta)
   */
  async createPage(
    meta: DatabasePatchDTO | CreatePageBodyParameters,
    content?: BlockObjectRequest[],
  ): Promise<DatabaseResponse> {
    const res: any = await rateLimitedFetch(notionPageApiURL(), {
      method: 'POST',
      headers: this.notionApiHeaders,
      body: JSON.stringify({
        ...('__data' in meta ? meta.__data : meta),
        parent: { database_id: this.notionDatabaseId },
        children: content && content.length > 0 ? content : undefined,
      }),
    })

    if (!res.ok) {
      console.error(await res.json())
      throw new Error(`Failed to create page in database (${this.notionDatabaseId}): ${res.status} ${res.statusText}`)
    }

    return await res.json()
  }

  /**
   * Archive a page in the Notion database.
   * Archived pages are not deleted, but are hidden from the database view.
   * The id of the archived page can not be restored.
   * It is recommended to save the id of the archived page if you plan to restore it later.
   *
   * @param id - Notion page id
   *
   * @example
   *
   * await db.archivePage('70b2b25b7f434306b5089486de5efced')
   */
  async archivePage(id: string): Promise<DatabaseResponse> {
    const res: any = await rateLimitedFetch(notionPageApiURL(id), {
      method: 'PATCH',
      headers: this.notionApiHeaders,
      body: JSON.stringify({ archived: true }),
    })

    if (!res.ok) {
      console.error(await res.json())
      throw new Error(
        `Failed to archive page ${id} (database id: ${this.notionDatabaseId}): ${res.status} ${res.statusText}`,
      )
    }

    return await res.json()
  }

  /**
   * Create a page in the Notion database
   *
   * @param id - Page or block id
   * @param content - Page content – Notion blocks. See Notion API documentation for the block format.
   *
   * @example
   *
   * await db.appendBlockChildren(pageId, content)
   */
  async appendBlockChildren(
    id: string,
    content: BlockObjectRequest[],
    opts?: AppendBlockChildrenParameters,
  ): Promise<ListBlockChildrenResponse> {
    const res: any = await rateLimitedFetch(notionPageContentApiURL(id, opts), {
      method: 'PATCH',
      headers: this.notionApiHeaders,
      body: JSON.stringify({
        children: content && content.length > 0 ? content : undefined,
      }),
    })

    if (!res.ok) {
      console.error(await res.json())
      throw new Error(
        `appendBlockChildren failed for database (${this.notionDatabaseId}): ${res.status} ${res.statusText}`,
      )
    }

    return await res.json()
  }

  /**
   * Get page content as blocks.
   * Retrieves ALL page blocks in a single request.
   *
   * @param id - Notion page id
   *
   * @returns - Notion page content. See Notion API documentation for the response format.
   * https://developers.notion.com/docs/working-with-page-content#modeling-content-as-blocks
   *
   * @example
   * const blocks = await db.getPageBlocks('70b2b25b7f434306b5089486de5efced')
   *
   * console.log(blocks[0].has_children)
   */
  async getPageBlocks(id: string): Promise<Array<BlockObjectResponseWithChildren>> {
    const blocks: BlockObjectResponseWithChildren[] = []
    const opts: ListBlockChildrenQueryParameters = { page_size: 100 }
    let listHasMore = false

    do {
      const res: any = await rateLimitedFetch(notionPageContentApiURL(id, opts), {
        method: 'GET',
        headers: this.notionApiHeaders,
      })

      if (!res.ok) {
        console.error(await res.json())
        throw new Error(
          `Failed to get page content (${id}) (database id: ${this.notionDatabaseId}): ${res.status} ${res.statusText}`,
        )
      }

      const list = (await res.json()) as ListBlockChildrenResponse

      for (const block of list.results as BlockObjectResponseWithChildren[]) {
        if (block.has_children) {
          block['children'] = await this.getPageBlocks(block.id)
        }

        blocks.push(block)
      }

      listHasMore = list.has_more
      opts.start_cursor = list.next_cursor ?? undefined
    } while (listHasMore)

    return blocks
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
