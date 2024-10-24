import { execSync } from "node:child_process";

type OutboundEveryoneValue = "all" | "none" | "whitelist";
type WhitelistPatternType = "strict" | "regex";

export type RuleMap = {
  outbound: {
    enabled: boolean;
    everyone: OutboundEveryoneValue;
    "audited-payload": Record<string, any>;
    partner: Record<string, any>;
  };
};

export type WhitelistPattern = {
  Id: string;
  Pattern: string;
  Type: WhitelistPatternType;
};

export class YaProvider {
  public getRules(): RuleMap {
    return this.callProvider("rule list");
  }

  public getWhitelist(): WhitelistPattern[] {
    return this.callProvider("whitelist list");
  }

  public addWhitelistPattern(value: string, type: WhitelistPatternType) {
    this.callProvider(`whitelist add --patterns "${value}" -t "${type}"`);
    return this.getWhitelist();
  }

  public removeWhitelistPattern(id: string) {
    this.callProvider(`whitelist remove "${id}"`);
    return this.getWhitelist();
  }

  public enableOutbound(): RuleMap {
    this.callProvider("rule set outbound enable");
    return this.getRules();
  }

  public disableOutbound(): RuleMap {
    this.callProvider("rule set outbound disable");
    return this.getRules();
  }

  public setOutboundEveryoneRule(value: OutboundEveryoneValue) {
    this.callProvider(`rule set outbound everyone ${value}`);
    return this.getRules();
  }

  private callProvider<T = unknown>(args: string) {
    const command = `ya-provider ${args} --json`;
    return JSON.parse(execSync(command).toString()) as T;
  }
}
