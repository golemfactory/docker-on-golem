import { OfferProposalFilter } from "@golem-sdk/golem-js";

export const acceptOperator: OfferProposalFilter = (proposal) =>
  proposal.provider.walletAddress.toLowerCase() ===
  "0xf1C67ab0d7C5a047410aF10e6D7fDae8DF944Cf9".toLowerCase();
