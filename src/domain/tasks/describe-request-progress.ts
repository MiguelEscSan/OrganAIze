export type RequestProgressCounts = {
  deployed: number;
  awaitingRelease: number;
  total: number;
};

export const describeRequestProgress = ({ deployed, awaitingRelease, total }: RequestProgressCounts): string => {
  if (awaitingRelease === 0) {
    return `${deployed} of ${total} deployed`;
  }

  if (deployed === 0) {
    return `${awaitingRelease} of ${total} awaiting release`;
  }

  return `${awaitingRelease} awaiting release, ${deployed} deployed of ${total}`;
};
