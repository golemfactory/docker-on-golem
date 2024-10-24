import chalk from "chalk";
import {
  GolemNetwork,
  MarketOrderSpec,
  ResourceRental,
  waitFor,
} from "@golem-sdk/golem-js";
import { runOrFail } from "../utils";
import fs from "node:fs";
import path from "node:path";

/**
 * @link https://github.com/golemfactory/yagna-docs/blob/master/requestor-tutorials/vm-runtime/computation-payload-manifest.schema.json
 */
function readAndEncodeManifest() {
  return fs
    .readFileSync(fs.realpathSync(path.join(__dirname, "../../manifest.json")))
    .toString("base64");
}

export type MainActionOpts = {
  spendRate: string;
  rentDuration: string;
  golemApiUrl: string;
  golemApiKey: string;
  port: string;
  verbose: boolean;
};

export const main = async (opts: MainActionOpts) => {
  const LOCAL_PROXY_PORT = parseInt(opts.port);
  const DOCKERD_LISTEN_PORT = 2375;

  const abort = new AbortController();
  console.log(chalk.green("Running with PID"), process.pid);

  const glm = new GolemNetwork({
    api: {
      key: opts.golemApiKey,
      url: opts.golemApiUrl,
    },
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

    const rentDuration = parseFloat(opts.rentDuration);
    const spendRate = parseFloat(opts.spendRate);

    if (rentDuration < 10 / 60) {
      throw new Error("Rent duration must be at least 10 minutes");
    }

    if (spendRate < 0) {
      throw new Error("The GLM/h spending should be greater than zero!");
    }

    const order: MarketOrderSpec = {
      demand: {
        workload: {
          imageTag: "golem/docker:27",
          minMemGib: 2,
          manifest: readAndEncodeManifest(),
          runtime: {
            name: "vm",
            version: "0.4.2",
          },
        },
      },
      market: {
        rentHours: rentDuration,

        pricing: {
          model: "burn-rate",
          avgGlmPerHour: spendRate,
        },
        offerProposalFilter: (proposal) =>
          proposal.provider.id === "0x37f0c1247da486729b0abbde51327616f7b4ee92",
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

    const {
      name: providerName,
      id: providerId,
      walletAddress: operatorId,
    } = rental.agreement.provider;

    console.log(
      chalk.green(
        "Rented resources from %s (id: %s, operator: %s), will now deploy image",
      ),
      providerName,
      providerId,
      operatorId,
    );

    rental.events.once("finalized", () => {
      chalk.green("Rental from %s (id: %s, operator: %s) has been finalized");
    });

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
      next: (stdout) => {
        if (opts.verbose) {
          console.log("dockerd >>> %s", stdout?.toString().trim());
        }
      },
      error: (err) => console.error("Failed to subscribe to STDOUT", err),
      complete: () => console.log("Finished STDOUT"),
    });

    let daemonReady = false;

    proc.stderr.subscribe({
      next: (stderr) => {
        stderr
          ?.toString()
          .trim()
          .split("\n")
          .forEach((line) => {
            if (opts.verbose) {
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
            }

            if (line.includes("API listen on [::]:2375")) {
              daemonReady = true;
            }
          });
      },
      error: (err) => console.error("Failed to subscribe to STDERR", err),
      complete: () => console.log("Finished STDERR"),
    });

    console.log(
      chalk.green(
        "Waiting for Docker daemon to become available on the Provider",
      ),
    );
    await waitFor(() => daemonReady, {
      abortSignal: abort.signal,
    });
    console.log(chalk.green("Daemon seems to be online"));

    const proxy = exe.createTcpProxy(DOCKERD_LISTEN_PORT);

    proxy
      .listen(LOCAL_PROXY_PORT, abort)
      .then(() => {
        console.log(
          chalk.green(`Started TCP proxy on port ${LOCAL_PROXY_PORT}`),
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
  } catch (err: any) {
    console.error(chalk.bgRed("Something went wrong: %s"), err.message ?? err);
  } finally {
    await glm.disconnect();
  }
};
