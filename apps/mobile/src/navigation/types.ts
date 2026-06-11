import type { NavigatorScreenParams } from "@react-navigation/native";

export type RootStackParamList = {
  Bootstrap: undefined;
  Login: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
};

export type MainTabParamList = {
  Home: undefined;
  Leads: undefined;
  Pipeline: undefined;
  Activities: undefined;
  More: undefined;
};

export type DashboardStackParamList = {
  Dashboard: undefined;
};

export type LeadsStackParamList = {
  LeadList: undefined;
  LeadDetail: { id: string };
  LeadCreate: undefined;
  LeadEdit: { id: string };
};

export type PipelineStackParamList = {
  OpportunityList: undefined;
  OpportunityDetail: { id: string };
  OpportunityCreate: { leadId?: string };
  OpportunityEdit: { id: string };
};

export type ActivitiesStackParamList = {
  ActivityList: undefined;
  ActivityDetail: { id: string };
  ActivityCreate: {
    leadId?: string;
    opportunityId?: string;
  };
  ActivityEdit: { id: string };
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  Profile: undefined;
  QuotationList: undefined;
  QuotationDetail: { id: string };
  QuotationCreate: { opportunityId?: string };
  QuotationEdit: { id: string };
  BookingList: undefined;
  BookingDetail: { id: string };
  Customer360: { id: string };
  CustomerTimeline: { id: string };
};
