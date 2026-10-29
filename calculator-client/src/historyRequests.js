export function createLatestRequestGate() {
  let latestRequest = 0;

  return {
    begin() {
      latestRequest += 1;
      return latestRequest;
    },
    invalidate() {
      latestRequest += 1;
    },
    isLatest(request) {
      return request === latestRequest;
    },
  };
}
