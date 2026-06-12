import * as React from "react";

export function diagnostics(): {
  version: string;
  resolvedUrl: string;
  selfUrl: string;
};

declare const ExternalReact: typeof React;
export default ExternalReact;
