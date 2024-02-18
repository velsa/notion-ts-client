# Notion Typescript Client

Generates an easy to use and fully typed API to access and modify the data in your Notion Databases!

## Usage:

- Cloudflare DNS
- Cloudflare workers
- Reverse proxy implementation
- TypeScript

## Supports:

- Basic page methods: `getPage` and `updatePage`
- Query with typed filters and sorts

<br/>

## Demo:

```ts
const db = new MyNotionDatabase({
  notionSecret: process.env.MY_NOTION_SECRET,
});

const pageResponse = await db.getPage("509931d4affa4f72beafaa6aac96f205");
const page = new MyNotionResponseDTO(pageResponse);

console.log(page.properties.name);

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
ALL of the above code is FULLY TYPED, meaning that every property will have a custom type, based on the configuration of your Notion database.

## How to use:

### Create a new integration in Notion

Visit: https://www.notion.so/my-integrations

Click "Create a new integration", give it any name you like, e.g. `NotionSDK`.

### Add databases to your integration

Add the databases you want to work with to your integration in Notion.

1. Go to the database page, click `...` at the top right corner.
2. "..." => "Add connections" -> The name of your integration

### Generate config file based on your integrations

Run

```sh
npx notion-ts-client init --secret <notion_secret>
```

A config file will be generated with config for all the databases you added to your integration.
You can review the config file and edit the `varName` and the `readOnly` fields to your liking.

## Generate Typescript Clients (SDK)

Once you are done editing the config file, you can generate Typescript Clients (SDK).
Those clients will export custom Typescript types and API methods for each database

Run

```sh
npx notion-ts-client generate --secret <notion_secret> --sdk <path_to_sdk>
```

The clients will be generated in the specified directory.

You can now access your Notion Databases in a fullproof and typesafe manner.
As you should!
