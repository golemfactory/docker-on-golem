#!/usr/bin/env node

import "dotenv/config";
import { Command } from "commander";
import pkg from "../package.json";
import { buildMainCommand } from "./commands/main";
import { buildConfigureProviderCmd } from "./commands/configure-provider";

const program = new Command("docker-on-golem");

program
  .version(pkg.version)
  .addCommand(buildMainCommand(), {
    isDefault: true,
  })
  .addCommand(buildConfigureProviderCmd());

program.parse();
