import 'dotenv/config'
import { AfishaDatabase, AfishaResponseDTO } from '../../out/notion-sdk/dbs/afisha'

describe('NotionSDK: AfishaDatabase', () => {
  let db: AfishaDatabase

  beforeAll(() => {
    if (!process.env.NOTION_TS_CLIENT_NOTION_SECRET) {
      throw new Error('NOTION_TS_CLIENT_NOTION_SECRET is not set')
    }

    db = new AfishaDatabase({
      notionSecret: process.env.NOTION_TS_CLIENT_NOTION_SECRET,
    })
  })

  test('NotionSDK: getPage gets a page', async () => {
    const pageResponse = await db.getPage('509931d4affa4f32b4af5a6aac96f205')
    const page = new AfishaResponseDTO(pageResponse)

    expect(page.properties.name).toBeDefined()
  })

  test('NotionSDK: getPage obeys Notion rate limit', async () => {
    const reqs = [...Array(30)].map(async () => {
      // console.log(`Getting page... ${i}`)
      const res = await db.getPage('509931d4affa4f32b4af5a6aac96f205')

      // console.log(`Got page... ${i}`)
      return res
    })
    const pageResponses = await Promise.all(reqs)
    const pages = pageResponses.map((pageResponse) => new AfishaResponseDTO(pageResponse))

    expect(pages[0]?.properties.name).toBeDefined()
  })

  test('NotionSDK: query returns results', async () => {
    const response = await db.query({
      filter: {
        and: [{ city: { equals: 'Герцлия' } }, { cost: { contains: 'бесплатно' } }],
      },
      sorts: [{ property: 'name', direction: 'ascending' }],
    })

    expect(response.results.length).toBeGreaterThan(0)
  })

  test('NotionSDK: get page blocks recursively', async () => {
    const blocks = await db.getPageBlocks('16e92772b45540079cb9c8c37ef28983')

    expect(blocks.length).toBeGreaterThan(0)
  })
})
