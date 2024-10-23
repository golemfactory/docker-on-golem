#!/usr/bin/env node

import "dotenv/config";
import { main } from "./actions/main";
import { Command, Option } from "commander";
import pkg from "../package.json";

const program = new Command("docker-on-golem");

program
  .version(pkg.version)
  .addOption(
    new Option("-k, --golem-api-key <key>", "The yagna app-key to use")
      .env("YAGNA_APP_KEY")
      .makeOptionMandatory(),
  )
  .addOption(
    new Option("-h, --golem-api-url <url>", "The URL to the yagna to use")
      .default("http://localhost:7465")
      .env("YAGNA_URL"),
  )
  .option(
    "-r, --spend-rate <amount>",
    "The GLM/h rate you want to spend on the cluster",
    "1",
  )
  .option(
    "-d, --rent-duration <hours>",
    "The number of hours you want to rent the resources for",
    (15 / 60).toString(),
  )
  .option(
    "-p, --port <port>",
    "Local proxy port that will be used to expose the docker API hosted on Golem Network",
    "3375",
  )
  .option("--verbose", "Produce verbose output (useful for debugging)", false)
  .action(main);

program.parse();
