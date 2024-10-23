import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";

type WhitelistEntry = {
  value: string;
  mode: "regex" | "strict";
};

type OutboundRuleEntry = {
  rule: string;
  mode: string;
};

const WHITELIST_REMOVE: WhitelistEntry[] = [];

const WHITELIST_ADD: WhitelistEntry[] = [
  {
    value: "registry-1.docker.io",
    mode: "strict",
  },
];

const OUTBOUND_RULE_ADD: OutboundRuleEntry[] = [
  {
    mode: "whitelist",
    rule: "everyone",
  },
];

function callProvider() {}

function pHeader(text: string) {
  console.log("");
  console.log(chalk.blue(text));
  console.log(new Array(text.length).fill("=").join(""));
  console.log("");
}

function informWhitelistRequirements() {
  pHeader("Whitelist requirements");
  console.log(
    "This project requires that you will configure your provider with the following whitelist entries:",
  );

  WHITELIST_ADD.map((entry) =>
    console.log(
      `+ [ ] ${chalk.green(entry.value)} (${chalk.green(entry.mode)})`,
    ),
  );
}

function informOutboundRequirements() {
  pHeader("Outbound requirements");
  console.log(
    "This project requires that you will configure your provider with the following outbound rules:",
  );

  OUTBOUND_RULE_ADD.map((entry) =>
    console.log(
      `+ [ ] ${chalk.green(entry.rule)} -> ${chalk.green(entry.mode)}`,
    ),
  );
}

export function buildConfigureProviderCmd() {
  const cmd = new Command("configure-provider");

  cmd
    .description(
      "Utility that helps in configuring the Golem Provider for the project",
    )
    .action(async () => {
      console.log(
        "This utility will help you to configure your Provider for the project",
      );

      informOutboundRequirements();
      informWhitelistRequirements();

      console.log("---");

      const answers = await inquirer.prompt([
        {
          name: "apply-changes",
          type: "confirm",
          message: "Do you want to apply required changes?",
          default: false,
        },
      ]);

      if (!answers["apply-changes"]) {
        console.log(chalk.green("No changes ware made :)"));
      } else {
        console.log("BzzzzZZzzzzZZzzzT!");
      }
    });

  return cmd;
}
