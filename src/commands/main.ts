import { Command, Option } from "commander";
import { main } from "../actions/main";

export function buildMainCommand() {
  const cmd = new Command("start");

  cmd
    .description("Start a Docker Swarm on Golem Network")
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
    .addOption(
      new Option(
        "--collaborator-config <file>",
        "Point the place of the file containing information about collaborating providers and operators",
      ),
    )
    .action(main);

  return cmd;
}
