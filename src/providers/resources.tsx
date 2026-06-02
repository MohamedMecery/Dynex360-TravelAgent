import { ResourceProps } from "@refinedev/core";
import {
  Users, Package, CalendarCheck, CreditCard, LayoutDashboard, Settings,
  MapPin, UserCircle, FileText, BookOpen, Headphones,
} from "lucide-react";

export const resources: ResourceProps[] = [
  {
    name: "dashboard",
    list: "/dashboard",
    meta: { label: "Dashboard", labelKey: "nav.dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  },
  {
    name: "customers",
    list: "/customers",
    create: "/customers/create",
    edit: "/customers/edit/:id",
    show: "/customers/show/:id",
    meta: { label: "Customers", labelKey: "nav.customers", icon: <Users className="h-4 w-4" /> },
  },
  {
    name: "travelers",
    list: "/travelers",
    create: "/travelers/create",
    edit: "/travelers/edit/:id",
    show: "/travelers/show/:id",
    meta: { label: "Travelers", labelKey: "nav.travelers", icon: <UserCircle className="h-4 w-4" /> },
  },
  {
    name: "destinations",
    list: "/destinations",
    create: "/destinations/create",
    edit: "/destinations/edit/:id",
    show: "/destinations/show/:id",
    meta: { label: "Destinations", labelKey: "nav.destinations", icon: <MapPin className="h-4 w-4" /> },
  },
  {
    name: "packages",
    list: "/packages",
    create: "/packages/create",
    edit: "/packages/edit/:id",
    show: "/packages/show/:id",
    meta: { label: "Packages", labelKey: "nav.packages", icon: <Package className="h-4 w-4" /> },
  },
  {
    name: "bookings",
    list: "/bookings",
    create: "/bookings/create",
    edit: "/bookings/edit/:id",
    show: "/bookings/show/:id",
    meta: { label: "Bookings", labelKey: "nav.bookings", icon: <CalendarCheck className="h-4 w-4" /> },
  },
  {
    name: "invoices",
    list: "/invoices",
    create: "/invoices/create",
    edit: "/invoices/edit/:id",
    show: "/invoices/show/:id",
    meta: { label: "Invoices", labelKey: "nav.invoices", icon: <FileText className="h-4 w-4" /> },
  },
  {
    name: "payments",
    list: "/payments",
    create: "/payments/create",
    show: "/payments/show/:id",
    meta: { label: "Payments", labelKey: "nav.payments", icon: <CreditCard className="h-4 w-4" /> },
  },
  {
    name: "users",
    list: "/users",
    create: "/users/create",
    show: "/users/show/:id",
    meta: { label: "Users", labelKey: "nav.users", icon: <Users className="h-4 w-4" /> },
  },
  {
    name: "ai-knowledge",
    list: "/ai/knowledge",
    meta: {
      label: "Knowledge Agent",
      labelKey: "nav.knowledgeAgent",
      icon: <BookOpen className="h-4 w-4" />,
    },
  },
  {
    name: "ai-support",
    list: "/ai/support",
    meta: {
      label: "Support Agent",
      labelKey: "nav.supportAgent",
      icon: <Headphones className="h-4 w-4" />,
    },
  },
  {
    name: "ai-booking",
    list: "/ai/booking",
    meta: {
      label: "Booking Agent",
      labelKey: "nav.bookingAgent",
      icon: <CalendarCheck className="h-4 w-4" />,
    },
  },
  {
    name: "settings",
    list: "/settings",
    meta: { label: "Settings", labelKey: "nav.settings", icon: <Settings className="h-4 w-4" /> },
  },
];
