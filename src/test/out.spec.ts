import {
  AfishaDatabase,
  AfishaResponseDTO,
} from "../../out/notion-sdk/dbs/afisha";

test("NotionSDK: getPage gets a page", async () => {
  const db = new AfishaDatabase({
    notionSecret: process.env.NOTION_TS_CLIENT_NOTION_SECRET,
  });

  const pageResponse = await db.getPage("509931d4affa4f32b4af5a6aac96f205");
  const page = new AfishaResponseDTO(pageResponse);

  expect(page.properties.name).toBeDefined();
});

test("NotionSDK: query returns results", async () => {
  const db = new AfishaDatabase({
    notionSecret: process.env.NOTION_TS_CLIENT_NOTION_SECRET,
  });

  const response = await db.query({
    filter: { city: { equals: "Герцлия" } },
    sorts: [{ property: "name", direction: "ascending" }],
  });

  expect(response.results.length).toBeGreaterThan(0);
});
