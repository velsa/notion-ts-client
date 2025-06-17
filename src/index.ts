#!/usr/bin/env node
import { Option, program } from "commander";
import dotenv from "dotenv";
import { version } from "../package.json";
import { generateTypescriptClients } from "./cli";

dotenv.config({
  path: [ ".env", ".env.local", ".env.dev", ".env.prod" ]
})

program
  .name("notion-ts-client")
  .description(
    "Notion Typescript CLI: Generate an easy to use and fully typed client API to access and modify the data in your Notion Databases."
  )
  .version(version);

const options = {
  secret: new Option(
    "--secret <secret>",
    "Notion API secret with read access to your databases"
  )
    .env("NOTION_TS_CLIENT_NOTION_SECRET")
    .makeOptionMandatory(),

  config: new Option("--config <config>", "Path to config file")
    .default("./notion-sdk.json")
    .env("NOTION_TS_CLIENT_CONFIG_PATH"),

  sdk: new Option("--sdk <sdk>", "Path to folder where the generated SDK will be saved")
    .default("./notion-sdk")
    .env("NOTION_TS_CLIENT_SDK_PATH"),
};

// program
//   .command("init")
//   .description("Initialize config file")
//   .action(initConfigFile)
//   .addOption(options.secret)
//   .addOption(options.config);

program
  .command("generate")
  .description(
    "Generate Typescript clients for all configured databases, also updates the config file if needed"
  )
  .action(generateTypescriptClients)
  .addOption(options.secret)
  .addOption(options.config)
  .addOption(options.sdk);

program.parse();
