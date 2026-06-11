import { useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDashboard } from "@/hooks/api/useDashboard";
import { useSalesWidgets } from "@/hooks/api/useSalesAi";
import { useOpsWidgets } from "@/hooks/api/useOperationsAi";
import { usePermission } from "@/hooks/usePermission";
import { useStackTitle } from "@/hooks/useStackTitle";
import { useTranslation } from "@/i18n/LocaleProvider";
import type { DashboardStackParamList, MainTabParamList } from "@/navigation/types";
import { useTheme } from "@/theme/useTheme";

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<DashboardStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

export function DashboardScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const [period, setPeriod] = useState<"month" | "quarter">("month");
  const canFinancial = usePermission("dashboard.financial");
  const { data, isLoading, isError, error, refetch, isRefetching } = useDashboard(period);
  const { data: salesWidgets } = useSalesWidgets();
  const { data: opsWidgets } = useOpsWidgets();

  useStackTitle(t("dashboard.title"));

  if (isLoading && !data) return <LoadingState />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const kpis = data?.kpis;
  const lists = data?.lists;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
      }
    >
      <View style={styles.periodRow}>
        {(["month", "quarter"] as const).map((p) => (
          <Pressable
            key={p}
            onPress={() => setPeriod(p)}
            style={[
              styles.periodBtn,
              {
                backgroundColor: period === p ? colors.primary : colors.surfaceMuted,
              },
            ]}
          >
            <Text
              style={{
                color: period === p ? colors.primaryForeground : colors.text,
                fontWeight: "600",
              }}
            >
              {p === "month" ? t("dashboard.month") : t("dashboard.quarter")}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.kpiGrid}>
        <Kpi title={t("dashboard.kpiLeads")} value={kpis?.leads_this_month} loading={isRefetching} />
        <Kpi title={t("dashboard.kpiOpenOpps")} value={kpis?.open_opportunities} loading={isRefetching} />
        <Kpi title={t("dashboard.kpiDueToday")} value={kpis?.activities_due_today} loading={isRefetching} />
        <Kpi title={t("dashboard.kpiOverdue")} value={kpis?.activities_overdue} loading={isRefetching} />
        {canFinancial && kpis?.forecast_revenue != null ? (
          <Kpi title={t("dashboard.kpiForecast")} value={kpis.forecast_revenue} loading={isRefetching} money />
        ) : null}
        {canFinancial && kpis?.closed_revenue != null ? (
          <Kpi title={t("dashboard.kpiClosedRev")} value={kpis.closed_revenue} loading={isRefetching} money />
        ) : null}
        {salesWidgets ? (
          <Kpi
            title={t("dashboard.kpiRecommendations")}
            value={salesWidgets.open_recommendations_count}
            loading={isRefetching}
          />
        ) : null}
        {opsWidgets ? (
          <Kpi
            title={t("mobile.ops.openRecommendations")}
            value={opsWidgets.open_recommendations_count}
            loading={isRefetching}
          />
        ) : null}
      </View>

      <Section title={t("dashboard.staleLeads")}>
        {lists?.stale_leads?.length ? (
          lists.stale_leads.map((lead) => (
            <Pressable
              key={lead.id}
              onPress={() =>
                navigation.getParent()?.navigate("Leads", {
                  screen: "LeadDetail",
                  params: { id: lead.id },
                })
              }
            >
              <Card style={styles.listCard}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>
                  {lead.full_name}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                  {lead.lead_number} · {t("dashboard.daysSinceContact", { days: lead.days_since_contact })}
                </Text>
              </Card>
            </Pressable>
          ))
        ) : (
          <Text style={{ color: colors.textMuted }}>{t("dashboard.noStaleLeads")}</Text>
        )}
      </Section>

      <Section title={t("dashboard.overdueActivities")}>
        {lists?.overdue_activities?.length ? (
          lists.overdue_activities.map((act) => (
            <Card key={act.id} style={styles.listCard}>
              <Text style={{ color: colors.text, fontWeight: "600" }}>{act.subject}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                {act.activity_type} · {t("dashboard.dueOn", { date: new Date(act.due_date).toLocaleDateString() })}
              </Text>
            </Card>
          ))
        ) : (
          <Text style={{ color: colors.textMuted }}>{t("dashboard.noOverdueActivities")}</Text>
        )}
      </Section>
    </ScrollView>
  );
}

function Kpi({
  title,
  value,
  loading,
  money,
}: {
  title: string;
  value?: number | null;
  loading?: boolean;
  money?: boolean;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <Card style={styles.kpiCard}>
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>{title}</Text>
      {loading && value == null ? (
        <Skeleton height={24} width={60} />
      ) : (
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700" }}>
          {value == null
            ? t("common.dash")
            : money
              ? value.toLocaleString(undefined, { style: "currency", currency: "USD" })
              : String(value)}
        </Text>
      )}
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  periodRow: { flexDirection: "row", gap: 8 },
  periodBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpiCard: { width: "47%", minHeight: 72 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  listCard: { marginBottom: 8 },
});
