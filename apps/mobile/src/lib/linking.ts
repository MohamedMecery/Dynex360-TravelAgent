import type { LinkingOptions } from "@react-navigation/native";
import * as Linking from "expo-linking";
import type { RootStackParamList } from "@/navigation/types";

export const linkingPrefixes = [
  Linking.createURL("/"),
  "travelos://",
];

export const linkingConfig: LinkingOptions<RootStackParamList> = {
  prefixes: linkingPrefixes,
  config: {
    screens: {
      Bootstrap: "",
      Login: "login",
      Main: {
        screens: {
          Home: {
            screens: {
              Dashboard: "home",
            },
          },
          Leads: {
            screens: {
              LeadList: "leads",
              LeadDetail: "lead/:id",
            },
          },
          Pipeline: {
            screens: {
              OpportunityList: "opportunities",
              OpportunityDetail: "opportunity/:id",
            },
          },
          Activities: {
            screens: {
              ActivityList: "activities",
              ActivityDetail: "activity/:id",
            },
          },
          More: {
            screens: {
              MoreMenu: "more",
              Profile: "profile",
              QuotationList: "quotations",
              QuotationDetail: "quotation/:id",
              BookingList: "bookings",
              BookingDetail: "booking/:id",
              Customer360: "customer/:id/360",
              CustomerTimeline: "customer/:id/timeline",
            },
          },
        },
      },
    },
  },
};
