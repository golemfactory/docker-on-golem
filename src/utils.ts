import { ExeUnit } from "@golem-sdk/golem-js";
import { format } from "util";

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
