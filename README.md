# Notion Typescript Client

Generates an easy to use and fully typed API to access and modify the data in your Notion Databases!

## Supports:

- Basic page methods: `getPage` and `updatePage`
- Database query with typed filters and sorts
- Built-in rate limiting for Notion API calls (TODO)
- Easy integration with Webhooks for building powerful automations and formulas (TODO)

<br/>

## Demo:

```ts
import {
  MyNotionDatabase,
  MyNotionResponseDTO,
  MyNotionPatchDTO
} from 'generated-notion-sdk/dbs/my-database'

const db = new MyNotionDatabase({
  notionSecret: process.env.MY_NOTION_SECRET,
});
const pageId = "509931d4affa4f72beafaa6aac96f205"

// Read the Notion DB page
// and access fully typed properties using a custom DTO (Data Transfer Object)
const pageResponse = await db.getPage(pageId);
const page = new MyNotionResponseDTO(pageResponse);

console.log(page.properties.city);

// Update the Notion DB via a fully typed custom DTO
// Note: for your convenience readOnly properties are not available on PatchDTO
const pageUpdate = new MyNotionPatchDTO({
  properties: {
    city: 'New York'
  }
})
await db.updatePage(pageId, pageUpdate)

// Query the Notion DB using fully typed filter and sorts
const queryResponse = await db.query({
  filter: { and: [
    city: { equals: "New York" },
    venue: { contains: "Irish Pub" },
  ]},
  sorts: [{ property: "name", direction: "ascending" }],
});

const pages = queryResponse.results.map((r) => new MyNotionResponseDTO(r));
```

The code looks nice, right? But there is much more under the hood.
ALL of the above code is FULLY TYPED, meaning that every property has a custom type which is directly linked to the configuration of your Notion database.

Some notes:

If a property in Notion has been renamed - simply generate your client sdk again and all your types and properties will be up to date. Your production code will not be affected, since under the hood property names are mapped to their IDs.

If a property in Notion has been removed or its type has been changed - this might be a problem for the production code!
Also, you will get detailed update on the changes made once you generate your client sdk. You will also likely get Typescript errors in your code, since the types have changed. Which presents an excelent opportunity for easy refactor!

## How to use:

### Create a new integration in Notion

Visit: https://www.notion.so/my-integrations

Click "Create a new integration" and give it any name you like, e.g. `NotionSDK`.

### Add databases to your integration

Add the databases you want to work with to your integration in Notion:

1. Go to the database page in Notion, click `...` at the top right corner.
2. "..." => "Add connections" -> The name of your integration

### Generate config file based on your integrations

Run

```sh
npx notion-ts-client init --secret <notion_secret>
```

A config file will be generated with config for all the databases you added to your integration.
You can review the config file and edit the `varName` and the `readOnly` fields to your liking.

### Generate Typescript Clients (SDK)

Once you are done editing the config file, you can generate Typescript Clients (SDK).
Those clients will export custom Typescript types and API methods for each database

Run

```sh
npx notion-ts-client generate --secret <notion_secret> --sdk <path_to_sdk>
```

The clients will be generated in the specified directory.

You can now access your Notion Databases in a fullproof and typesafe manner.
As you should!

## Using with notion webhooks (beta)

To get webhooks when the data in your Notion database changes you can use this service:

https://notion.hostedhooks.com/

It's a paid service and it costs $10 a month.
But it is way cheaper that services like Zapier and will give you maximum level of control over your data.

You can combine it with **notion-ts-client** by simply using `new MyNotionResponseDTO(webhookResponse)` in your webhook handler. This way you will get all the properties of a changed page with types and easy to use API. This will allow you to create ANY kind of automations and advanced formulas using the power of Typescript.

TODO: create webhook example
