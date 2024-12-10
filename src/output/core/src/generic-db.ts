import {
  AppendBlockChildrenBodyParameters,
  BlockObjectRequest,
  BlockObjectResponse,
  CreatePageBodyParameters,
  ListBlockChildrenQueryParameters,
  ListBlockChildrenResponse,
  UpdatePageBodyParameters,
} from '../types/notion-api.types'
import {
  normId,
  notionBlockApiURL,
  notionDatabaseQueryURL,
  notionPageApiURL,
  notionBlockChildrenApiURL,
} from './notion-urls'
import pThrottle, { ThrottleConfig } from './p-throttle'

export type DatabaseOptions = {
  // firebaseSecret: string
  notionSecret: string
}

export type BlockObjectResponseWithChildren = BlockObjectResponse & { children?: BlockObjectResponseWithChildren[] }

const defaultRateLimitConfig: ThrottleConfig = {
  // Environment name for the throttle, all async calls with the same env name will be throttled together
  env: 'notion-ts-client--fetch',
  // Notion API rate limit is 3 requests per second,
  // we make it 2 to be on a safe side
  limit: 2,
  interval: 1000,
}
let rateLimitedFetch = (logText: string) =>
  pThrottle({
    ...defaultRateLimitConfig,
    onDelay: ({ delay }) => {
      console.log(`rate limit: delayed by ${delay}ms, ${logText}`)
    },
  })(fetch)

export function configureNotionRateLimit(config: ThrottleConfig) {
  rateLimitedFetch = (logText: string) =>
    pThrottle({
      ...defaultRateLimitConfig,
      ...config,
      onDelay: config.onDelay
        ? ({ delay }) => {
            console.log(`rate limit: delayed by ${delay}ms, ${logText}`)
          }
        : undefined,
    })(fetch)
}

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
    const rateLimitedQuery = await rateLimitedFetch('query')
    const res = await rateLimitedQuery(
      notionDatabaseQueryURL(this.notionDatabaseId, this.queryRemapFilterProperties(filterProps)),
      {
        method: 'POST',
        headers: this.notionApiHeaders,
        body: JSON.stringify(notionQuery),
      },
    )

    if (!res.ok) {
      console.error('Query:', query, '\nResponse:', await res.json())
      throw new Error(
        `query: failed to query database ${normId(this.notionDatabaseId)}\n${res.status} ${res.statusText}`,
      )
    }

    return (await res.json()) as DatabaseQueryResponse
  }

  /**
   * Get a page from the Notion database
   *
   * @param id - Notion page id
   * @returns - Notion page data with page meta and properties.
   * Use your custom DTO type to parse the data.
   *
   * @example
   * const pageResponse = await db.getPage('70b2b25b7f434306b5089486de5efced')
   * const page = new MyDatabaseResponseDTO(pageResponse)
   *
   * console.log(page.properties.title)
   */
  async getPage(id: string): Promise<DatabaseResponse> {
    const rateLimitedGetPage = await rateLimitedFetch(`getPage(${id})`)
    const res = await rateLimitedGetPage(notionPageApiURL(id), {
      method: 'GET',
      headers: this.notionApiHeaders,
    })

    if (!res.ok) {
      console.error(await res.json())
      throw new Error(
        `getPage: failed to get metadata. Page id: ${normId(id)}, Database id: ${normId(
          this.notionDatabaseId,
        )}.\n${res.status} ${res.statusText}`,
      )
    }

    return (await res.json()) as DatabaseResponse
  }

  /**
   * Update a page in the Notion database
   *
   * @param id - Notion page id
   * @param patch - Patch data for page cover, icon and properties.
   * Use your custom DTO type to create the patch data.
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
  async updatePage(id: string, patch: DatabasePatchDTO | UpdatePageBodyParameters): Promise<DatabaseResponse> {
    const rateLimitedUpdatePage = await rateLimitedFetch(`updatePage(${id})`)
    const data = '__data' in patch ? patch.__data : patch
    const res = await rateLimitedUpdatePage(notionPageApiURL(id), {
      method: 'PATCH',
      headers: this.notionApiHeaders,
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      console.error(await res.json())
      throw new Error(
        `updatePage: failed to update metadata. Page id: ${normId(id)}, Database id: ${normId(
          this.notionDatabaseId,
        )}.\n ${res.status} ${res.statusText}`,
      )
    }

    return (await res.json()) as DatabaseResponse
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
    const data = '__data' in meta ? meta.__data : meta
    const rateLimitedCreatePage = await rateLimitedFetch(`createPage`)
    const res = await rateLimitedCreatePage(notionPageApiURL(), {
      method: 'POST',
      headers: this.notionApiHeaders,
      body: JSON.stringify({
        ...data,
        parent: { database_id: this.notionDatabaseId },
        children: content && content.length > 0 ? content : undefined,
      }),
    })

    if (!res.ok) {
      console.error(await res.json())
      throw new Error(
        `createPage: failed for database ${normId(this.notionDatabaseId)}\n${res.status} ${res.statusText}`,
      )
    }

    return (await res.json()) as DatabaseResponse
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
    const rateLimitedArchivePage = await rateLimitedFetch(`archivePage(${id})`)
    const res = await rateLimitedArchivePage(notionPageApiURL(id), {
      method: 'PATCH',
      headers: this.notionApiHeaders,
      body: JSON.stringify({ archived: true }),
    })

    if (!res.ok) {
      console.error(await res.json())
      throw new Error(
        `archivePage: failed. Page id: ${normId(id)}, Database id: ${normId(this.notionDatabaseId)}.\n${res.status} ${res.statusText}`,
      )
    }

    return (await res.json()) as DatabaseResponse
  }

  /**
   * Append content to a page or block in the Notion database
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
    opts?: Omit<AppendBlockChildrenBodyParameters, 'children'>,
  ): Promise<ListBlockChildrenResponse> {
    const rateLimitedAppendBlockChildren = await rateLimitedFetch(`appendBlockChildren(${id})`)
    const res = await rateLimitedAppendBlockChildren(notionBlockChildrenApiURL(id), {
      method: 'PATCH',
      headers: this.notionApiHeaders,
      body: JSON.stringify({
        children: content && content.length > 0 ? content : undefined,
        after: opts?.after
      }),
    })

    if (!res.ok) {
      console.error(await res.json())
      throw new Error(
        `appendBlockChildren: failed for database ${normId(this.notionDatabaseId)}.\n${res.status} ${res.statusText}`,
      )
    }

    return (await res.json()) as ListBlockChildrenResponse
  }

  /**
   * Update content of a page or a block in the Notion database
   * Recursively updates blocks content if it is different from existing content.
   *
   * @param id - Page or block id
   * @param content - Page content – Notion blocks. See Notion API documentation for the block format.
   * This functions supports children property in the block object to update nested blocks.
   *
   * @example
   *
   * await db.updateBlockChildren(pageId, content)
   */
  async updateBlockChildren(
    id: string,
    content: (BlockObjectRequest & { children?: BlockObjectRequest[] })[],
  ): Promise<Array<BlockObjectResponseWithChildren>> {
    const blocks = await this.getPageBlocks(id)

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i] as BlockObjectResponseWithChildren
      const updateBlock = content[i] as BlockObjectRequest
      const blockContent = block[block.type as keyof BlockObjectResponseWithChildren] as unknown
      const { children: updateBlockChildren, ...updateBlockContent } = (updateBlock[
        updateBlock.type as keyof BlockObjectRequest
      ] || {}) as { children?: BlockObjectRequest[] }

      if (!updateBlock || !updateBlockContent) {
        await this.archiveBlock(block.id)
        continue
      }

      if (block.type !== updateBlock.type) {
        await this.appendBlockChildren(id, [updateBlock], { after: block.id })
        await this.archiveBlock(block.id)
        continue
      }

      if (JSON.stringify(blockContent) !== JSON.stringify(updateBlockContent)) {
        delete (updateBlockContent as BlockObjectRequest)['type']

        const rateLimitedUpdateBlock = await rateLimitedFetch(`updateBlock(${id})`)
        const res = await rateLimitedUpdateBlock(notionBlockApiURL(block.id), {
          method: 'PATCH',
          headers: this.notionApiHeaders,
          body: JSON.stringify({ [updateBlock.type]: updateBlockContent }),
        })

        if (!res.ok) {
          console.error(await res.json())
          throw new Error(
            `updateBlockChildren: failed for database ${normId(this.notionDatabaseId)}.\n${res.status} ${
              res.statusText
            }`,
          )
        }
      }

      if (block.has_children) {
        if (!updateBlockChildren || updateBlockChildren.length === 0) {
          const children = await this.getPageBlocks(block.id)
          const archiveChildren = children.map(async (child) => {
            await this.archiveBlock(child.id)
          })

          await Promise.all(archiveChildren)
          continue
        }

        await this.updateBlockChildren(block.id, updateBlockChildren)
      }
    }

    return await this.getPageBlocks(id)
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
  async getPageBlocks(id: string, opts: ListBlockChildrenQueryParameters = { page_size: 100 }): Promise<Array<BlockObjectResponseWithChildren>> {
    const blocks: BlockObjectResponseWithChildren[] = []
    let listHasMore = false
    const rateLimitedGetPageBlocks = await rateLimitedFetch(`getPageBlocks(${id})`)

    do {
      const res = await rateLimitedGetPageBlocks(notionBlockChildrenApiURL(id, opts), {
        method: 'GET',
        headers: this.notionApiHeaders,
      })

      if (!res.ok) {
        console.error(await res.json())
        throw new Error(
          `getPageBlocks: failed to get page content. Page Id: ${normId(id)}, Database id: ${normId(
            this.notionDatabaseId,
          )}.\n${res.status} ${res.statusText}`,
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

  /**
   * Archive a block in the Notion page or inside another block.
   * Archived blocks are not deleted, but are moved to Trash.
   *
   * @param id - Notion block id
   *
   * @example
   *
   * await db.archiveBlock('70b2b25b7f434306b5089486de5efced', { recursive: true })
   */
  async archiveBlock(id: string): Promise<BlockObjectResponseWithChildren> {
    const rateLimitedArchiveBlock = await rateLimitedFetch(`archiveBlock(${id})`)
    const res = await rateLimitedArchiveBlock(notionBlockApiURL(id), {
      method: 'DELETE',
      headers: this.notionApiHeaders,
    })

    if (!res.ok) {
      console.error(await res.json())
      throw new Error(
        `archiveBlock: failed. Block id: ${normId(id)}, Database id: ${normId(this.notionDatabaseId)}.\n${res.status} ${res.statusText}`,
      )
    }

    return (await res.json()) as BlockObjectResponseWithChildren
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
