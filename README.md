# Notion Typescript Client

Generates an easy to use and fully typed API client to access and modify the data in your Notion Databases!

## Supports:

- Database query with fully typed filters and sorts
- Fully typed database page methods: `getPage` and `updatePage`
- Built-in <a href="https://developers.notion.com/reference/request-limits" target="_blank">rate limiting</a> for Notion API calls
- Quick start with an easy to use CLI: `npx notion-ts-client`
- Customize variable and type names using JSON config file
- Define read-only properties via config file for additional safety

## What can you do with it?

Create complex calculations and intelligent automations for your Notion Databases using Typescript, ensuring complete type safety. Use automagically generated SDK with Custom Types per Database to safely read from and write to your Notion databases

- Use **notion-ts-client** with Webhooks for building powerful automations and formulas (see example below)
- Use Notion as your Database / Backoffice and use **notion-ts-client** to generate custom Typescript SDKs for your code. Ensure complete type equality between your backend and frontend.

<br/>

## Demo:

```ts
// Let's imagine you have a database of online events in your Notion :)
import {
  OnlineEventsDatabase,
  OnlineEventsResponseDTO,
  OnlineEventsPatchDTO
} from 'notion-sdk/dbs/online-events'

const db = new OnlineEventsDatabase({
  notionSecret: process.env.MY_NOTION_SECRET,
});
const pageId = "509931d4affa4f72beafaa6aac96f205"

// Read the Notion DB page
// and access fully typed properties using a custom DTO (Data Transfer Object)
const pageResponse = await db.getPage(pageId);
const page = new OnlineEventsResponseDTO(pageResponse);

console.log(page.properties.shortDescription);

// Update the Notion DB via a fully typed custom DTO
// Note: for your convenience readOnly properties are not available on PatchDTO
const pageUpdate = new OnlineEventsPatchDTO({
  properties: {
    organization: 'My Org'
  }
})
await db.updatePage(pageId, pageUpdate)

// Query the Notion DB using fully typed filter and sorts
const queryResponse = await db.query({
  filter: { and: [
    type: { contains: "Webinar" },
    organization: { equals: "My Org" },
  ]},
  sorts: [{ property: "name", direction: "ascending" }],
});

const pages = queryResponse.results.map((r) => new OnlineEventsResponseDTO(r));
```

The code looks nice, right? But there is much more under the hood.
ALL of the above code is FULLY TYPED, meaning that every property has a custom type which is directly linked to the configuration of your Notion database.

<br/>

## How to use:

### Create a new integration in Notion

Visit: https://www.notion.so/my-integrations

Click `Create a new integration` and give it any name you like, e.g. `NotionSDK`.

Copy the secret token.

### Add databases to your integration

Add the databases you want to work with to your integration in Notion:

1. Go to the database page in Notion
2. Click `...` at the top right corner
3. `...` => `Add connections` => The name of your integration

### Generate config file based on your integrations

Run the `init` command:

```sh
npx notion-ts-client init --secret <notion_secret>
```

A config file will be generated for all the databases you added to your integration. Generated configuration reflects your database and its properties. You can read about the structure of Notion databases and the available property types <a href="https://developers.notion.com/docs/working-with-databases#structure" target="_blank">in the Notion docs</a>

Here is an example of a generated config file:

```ts
// notion-ts-client.config.json
{
  "databases": {
    "70b2b25b-7f13-4306-b56a-9486f01efced": {
      "name": "🎫 Online Events",   // The name of your Database in Notion (don't change)
      "varName": "onlineEvents",    // The base name used to generate custom types for your Database
      "pathName": "online-events",  // Path of your database in SDK folder (<sdk-path>/dbs/online-events)
      "properties": {               // You can change "varName" and "readOnly" fields for each property
                                    // This change will be reflected in the generated SDK
        "C%3DP_": {                 // Notion property ID (don't change)
          "name": "Type",           // Notion property name (don't change)
          "type": "multi_select",   // Notion property type (don't change)
          "varName": "type",        // variable name to be generated in the SDK
          "readOnly": false         // read only properties will not be available in DTOs used for writes
        },
        "%3D%3DNA": {
          "name": "Organization",
          "type": "select",
          "varName": "organization",
          "readOnly": false
        },
        "%3DK%3F%3A": {
          "name": "Short Description",
          "type": "rich_text",
          "varName": "shortDescription",
          "readOnly": false
        },
        // ...
```

Once you are done reviewing the config file and editing the `varName` and `readOnly` fields for the properties, you can continue to SDK generation.

### Generate Typescript Clients (SDK)

When you run the `generate` command, **notion-ts-client** automatically updates your config file based on the current database configuration in Notion and generates Typescript Clients (SDKs). Those clients export custom Typescript types and API methods for each database.

Run the `generate` command:

```sh
npx notion-ts-client generate --secret <notion_secret> --sdk <path_to_sdk>
```

The Typescript Clients will be generated in the specified directory.

You can now access your Notion Databases in a fullproof and typesafe manner. As you should!

### Environment variables

You can also configure your Notion secret and other cli options via environment variables. **notion-ts-client** uses `dotenv/config` to read the environment, so you can create `.env` file in your project root and put all cli config there:

```sh
NOTION_TS_CLIENT_NOTION_SECRET=<notion_secret>
NOTION_TS_CLIENT_CONFIG_PATH=./notion-ts-client.config.json
NOTION_TS_CLIENT_SDK_PATH=./src/notion-sdk
```

Now you can simply run

```sh
npx notion-ts-client generate
```

to regenerate your SDKs whenever you need to reflect in your code the changes that were made in Notion.

<br/>

## Using notion-ts-client with webhooks

To get a webhook every time the data in your Notion database changes you can use this service:

https://notion.hostedhooks.com/

It's a paid service and it costs $10 a month. But it is way better than services like Zapier and will give you maximum level of control over your data.

You can utilize **notion-ts-client** by simply calling `new YourCustomResponseDTO(payload)` in your webhook handler. This way you will get all the properties of a changed page with types and an easy to use API.

Create ANY kind of automations and advanced formulas using the power of Typescript! 😎

### Webhook example

Using Cloudflare Workers:

```ts
import { OnlineEventsResponse, OnlineEventsResponseDTO } from 'notion-sdk/dbs/online-events'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'POST') {
      const payload: OnlineEventsResponse = await request.json()
      const props = new OnlineEventsResponseDTO(payload).properties
      // process page properties...
      // update notion page with new properties
    }
  },
}
```

<br/>

## Important notes for usage in production:

If a property in your Notion database has been **renamed** - your production code will not be affected, since under the hood all API calls use property IDs.

If a property in Notion has been **removed** or its **type has been changed** - this might present a problem for the production code. The solution is: before removing a property from Notion database or changing its type – make sure that your production code will not fail when this change is applied in Notion.

Next time you run the `generate` command, you will get an updated config file and Client SDK, reflecting all the changes in your Notion databases. You might also see some Typescript errors in your code, since the types have changed. Which presents an excelent opportunity to adapt your code to the changes! 😎

---

License

MIT © Vels Lobak
