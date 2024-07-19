import { ExeUnit } from "@golem-sdk/golem-js";
import { format } from "util";

export function waitFor(
  check: () => boolean | Promise<boolean>,
  opts?: { intervalSeconds?: number; abortSignal: AbortSignal },
): Promise<void> {
  const intervalSeconds = opts?.intervalSeconds ?? 1;

  let verifyInterval: NodeJS.Timeout | undefined;

  const verify = new Promise<void>((resolve, reject) => {
    verifyInterval = setInterval(async () => {
      if (opts?.abortSignal.aborted) {
        resolve();
      }

      if (await check()) {
        resolve();
      }
    }, intervalSeconds * 1000);
  });

  return verify.finally(() => {
    clearInterval(verifyInterval);
  });
}

export async function runOrFail(exe: ExeUnit, cmd: string) {
  const result = await exe.run(cmd);
  if (result.result === "Error") {
    throw new Error(
      format(
        "Failed to run the command '%s' on Golem: '%s, %s'",
        cmd,
        result.stdout?.toString().trim(),
        result.message,
      ),
    );
  } else {
    return result.stdout?.toString().trim() ?? null;
  }
}
