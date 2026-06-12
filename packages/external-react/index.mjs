// ESM import bypasses Next's CJS require hook for "react", so this resolves the
// real node_modules react — the same copy @react-pdf/renderer's pure-ESM dist uses.
import * as React from "react";

export function diagnostics() {
  return {
    version: React.version ?? React.default?.version,
    resolvedUrl: import.meta.resolve ? import.meta.resolve("react") : "n/a",
    selfUrl: import.meta.url,
  };
}

export default React.default ?? React;
export * from "react";
