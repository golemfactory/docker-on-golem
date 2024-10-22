#!/usr/bin/env node

import "dotenv/config";
import chalk from "chalk";
import {
  GolemNetwork,
  MarketOrderSpec,
  ResourceRental,
  waitFor,
} from "@golem-sdk/golem-js";
import { runOrFail } from "./utils";
import { printFundingRequest } from "./funding";
import fs from "fs";

/**
 * @link https://github.com/golemfactory/yagna-docs/blob/master/requestor-tutorials/vm-runtime/computation-payload-manifest.schema.json
 */
function readAndEncodeManifest() {
  return fs.readFileSync("./manifest.json").toString("base64");
}

(async () => {
  const LOCAL_PROXY_PORT = 3375;
  const DOCKERD_LISTEN_PORT = 2375;

  const abort = new AbortController();
  console.log(chalk.green("Running with PID"), process.pid);

  const glm = new GolemNetwork({
    payment: {
      network: "polygon",
    },
  });

  try {
    await glm.connect();

    glm.market.events.on("offerCounterProposalRejected", (event) => {
      console.log("Got my proposal rejected", event.reason);
    });

    const network = await glm.createNetwork({
      ip: "192.168.7.0/24",
    });

    const order: MarketOrderSpec = {
      demand: {
        workload: {
          imageTag: "golem/docker:27",
          minMemGib: 2,
          // manifest: readAndEncodeManifest(),
          runtime: {
            name: "vm",
            version: "0.4.2",
          },
        },
      },
      market: {
        // 15 minutes
        rentHours: 15 / 60,

        pricing: {
          model: "burn-rate",
          avgGlmPerHour: 1,
        },
        // offerProposalFilter: acceptOperator,
      },
      network,
    };

    let rental: ResourceRental;

    process.on("SIGINT", () => {
      (async () => {
        console.log(chalk.yellow("Shutting down, my PID is", process.pid));
        abort.abort("SIGINT called");
        await rental?.stopAndFinalize();
        await glm.disconnect();
        console.log("Finished");
      })().catch(console.error);
    });

    rental = await glm.oneOf({
      order,
    });

    const providerName = rental.agreement.provider.name;

    console.log(
      chalk.green("Rented resources from %s, will now deploy image"),
      providerName,
    );

    const exe = await rental.getExeUnit();
    console.log(chalk.green("Image deployed"));

    // Configure the hostname
    await runOrFail(exe, `hostname ${providerName}`);

    // Prepare place for artifacts
    await runOrFail(exe, `mount -t tmpfs -o size=1g none /var/lib/docker`);
    await runOrFail(exe, "mkdir /var/run/docker");
    await runOrFail(exe, `mount -t tmpfs -o size=1g none /var/run/docker`);

    // Docker requiest cgroup devices
    await runOrFail(exe, "mkdir /tmp/cgroup-devices");
    await runOrFail(
      exe,
      "mount -t cgroup -o devices devices /tmp/cgroup-devices",
    );

    // await runOrFail(exe, "mdkir /var/run/docker && chown :docker /var/run/docker")
    // await runOrFail(exe, `mount -t tmpfs -o size=1g none /var/run/docker`);

    // console.log(await runOrFail(exe, `realpath /etc/localtime`));
    // await runOrFail(exe, `chmod -R 0775 /var/lib/docker`)
    // await runOrFail(exe, `chown -R :docker /var/lib/docker`)
    // await runOrFail(exe, `chmod -R 0775 /var/run/docker`)
    // await runOrFail(exe, `chown -R :docker /var/run/docker`)
    // await runOrFail(exe, `chown -R :docker /var/run/docker`)

    await runOrFail(
      exe,
      `echo '${JSON.stringify({
        "default-address-pools": [{ base: "172.80.0.0/16", size: 24 }],
        bridge: "none",
        iptables: false,
        hosts: [
          `tcp://0.0.0.0:${DOCKERD_LISTEN_PORT}`,
          "unix:///var/run/docker.sock",
        ],
        dns: ["1.1.1.1"],
      })}' > /tmp/daemon.json`,
    );
    // console.log("Directory structure", await runOrFail(exe, "ls -al"));
    // console.log("Config file contents", await runOrFail(exe, "cat ./var/lib/docker/daemon.json"));

    // console.log(await runOrFail(exe, `mount`));
    // console.log(await runOrFail(exe, `cat /tmp/daemon.json`));
    // await runOrFail(exe, `cat /etc/resolv.conf`);

    // Run the daemon
    const entrypoint = "sleep 5 && dockerd --config-file /tmp/daemon.json";
    const proc = await exe.runAndStream(entrypoint);

    console.log(
      chalk.green("Spawned command '%s' on provider %s"),
      entrypoint,
      providerName,
    );

    proc.stdout.subscribe({
      next: (stdout) =>
        console.log("dockerd >>> %s", stdout?.toString().trim()),
      error: (err) => console.error("Failed to subscribe to STDOUT", err),
      complete: () => console.log("Finished STDOUT"),
    });

    proc.stderr.subscribe({
      next: (stderr) => {
        stderr
          ?.toString()
          .trim()
          .split("\n")
          .forEach((line) => {
            if (line.includes("level=info")) {
              console.error(
                chalk.blue("dockerd INFO %s"),
                line.replace("level=info", ""),
              );
            } else if (line.includes("level=warning")) {
              console.error(
                chalk.yellow("dockerd WARN %s"),
                line.replace("level=warning", ""),
              );
            } else {
              console.error(chalk.red("dockerd ERROR %s"), line);
            }
          });
      },
      error: (err) => console.error("Failed to subscribe to STDERR", err),
      complete: () => console.log("Finished STDERR"),
    });

    const proxy = exe.createTcpProxy(DOCKERD_LISTEN_PORT);

    proxy
      .listen(LOCAL_PROXY_PORT, abort)
      .then(() => {
        console.log(
          chalk.green(`Started TCP proxy on port ${LOCAL_PROXY_PORT}.'`),
        );
        console.log(
          chalk.green(
            `Run: docker context create golem-provider --docker "host=tcp://localhost:${LOCAL_PROXY_PORT}"`,
          ),
        );
        console.log(
          chalk.green("to establish link to the deployed docker instance"),
        );
      })
      .catch((err) => console.error("Failed to start TCP proxy", err));

    // Wait for the process to exit
    await waitFor(() => proc.isFinished(), {
      abortSignal: abort.signal,
    });

    // const prompt = promptSync();
    //
    // let value;
    // while (value = prompt("golem < ")) {
    //   if (value === '\quit') {
    //     abort.abort("User called 'quit'");
    //   } else {
    //     runOrFail(exe, value)
    //       .then((output) => console.log("> %s", output))
    //       .catch((err) => console.error("! %s", err));
    //   }
    // }

    console.log(
      "Contents of /var/lib/docker",
      await runOrFail(exe, "ls -al /var/lib/docker"),
    );
    console.log(
      "Contents of /var/run/docker",
      await runOrFail(exe, "ls -al /var/run/docker"),
    );
  } catch (err: any) {
    console.error(chalk.bgRed("Something went wrong: %s"), err.message ?? err);
  } finally {
    await glm.disconnect();
    printFundingRequest();
  }
})().catch(console.error);
