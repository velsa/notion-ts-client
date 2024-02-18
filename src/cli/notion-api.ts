import { Client } from '@notionhq/client'
import { SearchResponse } from '../output/core/types/notion-api.types'
import { log, logError } from './log'

export async function fetchNotionDatabases(secret: string): Promise<SearchResponse> {
  const notion = new Client({ auth: secret })

  log('Fetching databases from Notion...')

  try {
    return await notion.search({
      filter: {
        value: 'database',
        property: 'object',
      },
    })
  } catch (error) {
    console.error(error)

    if (error.code === 401) {
      logError('Make sure your Notion API secret is correct.')
    }

    process.exit(1)
  }
}
