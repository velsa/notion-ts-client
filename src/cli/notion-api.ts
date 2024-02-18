import { Client } from '@notionhq/client'
import { SearchResponse } from '../output/core/types/notion-api.types'

export async function fetchNotionDatabases(secret: string): Promise<SearchResponse> {
  // ---
  // Read the response from Notion API
  const notion = new Client({ auth: secret })

  console.log('------------------ READING NOTION DATABASES ------------------')

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
      console.error('Make sure your Notion API secret is correct.')
    }

    process.exit(1)
  }
}
