import { OfferProposalFilter } from "@golem-sdk/golem-js";

export function anyOfPassing(
  filters: OfferProposalFilter[],
): OfferProposalFilter {
  return (proposal) => {
    return filters.reduce(
      (acc, filter) => (acc ? acc : filter(proposal)),
      false,
    );
  };
}

export const acceptAll: OfferProposalFilter = () => true;
