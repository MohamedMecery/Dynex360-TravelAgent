type Messages = typeof import("../../messages/en.json");

declare module "next-intl" {
  interface IntlMessages extends Messages {}
}

export {};
