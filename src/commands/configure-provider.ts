import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import { YaProvider } from "../lib/ya-provider";

type WhitelistEntry = {
  value: string;
  mode: "regex" | "strict";
};

type OutboundRuleEntry = {
  rule: string;
  mode: string;
};

const WHITELIST_REMOVE: WhitelistEntry[] = [
  {
    value: "registry-1.docker.io",
    mode: "strict",
  },
];

const WHITELIST_ADD: WhitelistEntry[] = [
  {
    value: "(.*)\\.docker\\.(io|com)$",
    mode: "regex",
  },
];

const OUTBOUND_RULE_ADD: OutboundRuleEntry[] = [
  {
    mode: "whitelist",
    rule: "everyone",
  },
];

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
  const provider = new YaProvider();
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

      if (answers["apply-changes"]) {
        const rules = provider.getRules();

        if (!rules["outbound"]["enabled"]) {
          console.log("Enabling outbound");
          provider.enableOutbound();
        } else {
          console.log("Outbound already enabled, no action");
        }

        if (rules["outbound"]["everyone"] !== "whitelist") {
          console.log("Switching outbound rule to everyone=whitelist");
          provider.setOutboundEveryoneRule("whitelist");
        } else {
          console.log(
            "Outbound rule everyone=whitelist already set, no action",
          );
        }

        // Whitelist configuration
        WHITELIST_ADD.map((entry) => {
          console.log(
            `Adding whitelist entry for '${entry.value}" (${entry.mode})'`,
          );
          provider.addWhitelistPattern(entry.value, entry.mode);
        });

        WHITELIST_REMOVE.map((entry) => {
          const list = provider.getWhitelist();
          const match = list.find(
            (wle) => wle.Pattern == entry.value && wle.Type === entry.mode,
          );
          if (match) {
            console.log(
              `Removing whitelist entry for '${entry.value}" (${entry.mode})'`,
            );
            provider.removeWhitelistPattern(match.Id);
          }
        });
      } else {
        console.log("No changes applied");
      }
    });

  return cmd;
}
