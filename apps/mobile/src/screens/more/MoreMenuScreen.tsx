import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { usePermission } from "@/hooks/usePermission";
import { useStackTitle } from "@/hooks/useStackTitle";
import { useTranslation, type AppLocale } from "@/i18n/LocaleProvider";
import type { MoreStackParamList } from "@/navigation/types";
import { useTheme } from "@/theme/useTheme";

type Props = NativeStackScreenProps<MoreStackParamList, "MoreMenu">;

export function MoreMenuScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { t, locale, setLocale } = useTranslation();
  const canQuotations = usePermission("crm.quotations.read");
  const canBookings = usePermission("bookings.read");

  useStackTitle(t("nav.more"));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Card>
        <Text style={[styles.title, { color: colors.text }]}>{t("nav.more")}</Text>
        {canQuotations ? (
          <Button
            title={t("nav.quotations")}
            onPress={() => navigation.navigate("QuotationList")}
          />
        ) : null}
        {canBookings ? (
          <Button title={t("nav.bookings")} onPress={() => navigation.navigate("BookingList")} />
        ) : null}
        <Select<AppLocale>
          label={t("nav.language")}
          value={locale}
          options={[
            { value: "en", label: t("nav.english") },
            { value: "ar", label: t("nav.arabic") },
          ]}
          onChange={setLocale}
        />
        <Button title={t("nav.profile")} variant="secondary" onPress={() => navigation.navigate("Profile")} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
});
