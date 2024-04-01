import { AppendBlockChildrenParameters, ListBlockChildrenQueryParameters } from '../types/notion-api.types'

export const normId = (id: string) => id.replace(/-/g, '')

export const notionPageApiURL = (pageId?: string) =>
  pageId ? `https://api.notion.com/v1/pages/${normId(pageId)}` : `https://api.notion.com/v1/pages`

export const notionPageContentApiURL = (
  pageId: string,
  opts?: ListBlockChildrenQueryParameters | AppendBlockChildrenParameters,
) =>
  opts
    ? `https://api.notion.com/v1/blocks/${normId(pageId)}/children?${new URLSearchParams(opts as Record<string, string>).toString()}`
    : `https://api.notion.com/v1/blocks/${normId(pageId)}/children`

export const notionBlockApiURL = (blockId: string) => `https://api.notion.com/v1/blocks/${normId(blockId)}`

export const notionDatabaseQueryURL = (id: string, filterProps?: string[]) =>
  filterProps?.length
    ? `https://api.notion.com/v1/databases/${normId(id)}/query?${new URLSearchParams(
        filterProps.map((p) => ['filter_properties', decodeURIComponent(p)]) as [string, string][],
      ).toString()}`
    : `https://api.notion.com/v1/databases/${normId(id)}/query`
