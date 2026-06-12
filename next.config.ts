import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  devIndicators: false,
  transpilePackages: ["@refinedev/nextjs-router"],
  // PDF rendering must stay on ONE React instance. Route handlers are bundled
  // against Next's vendored React 19 canary, so elements created there are
  // rejected by @react-pdf/renderer's reconciler (React error #31, every PDF
  // endpoint 500s). Both packages are external so the PDF document trees are
  // created AND reconciled with the node_modules react copy — PDF modules use
  // a /** @jsx */ pragma bound to @travelos/external-react.
  serverExternalPackages: ["@react-pdf/renderer", "@travelos/external-react"],
};

export default withNextIntl(nextConfig);
