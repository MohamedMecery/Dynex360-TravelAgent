import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { useStackTitle } from "@/hooks/useStackTitle";
import { useTranslation } from "@/i18n/LocaleProvider";
import { useTheme } from "@/theme/useTheme";

export function ProfileScreen() {
  const { colors } = useTheme();
  const { profile, signOut } = useAuth();
  const { t } = useTranslation();

  useStackTitle(t("nav.profile"));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Card>
        <Text style={[styles.name, { color: colors.text }]}>
          {profile?.full_name ?? profile?.email}
        </Text>
        <Text style={{ color: colors.textMuted }}>{profile?.email}</Text>
        <Text style={{ color: colors.textMuted, marginTop: 8 }}>
          {t("profile.role")}: {profile?.role}
        </Text>
        <Text style={{ color: colors.textMuted }}>
          {t("profile.tenant")}: {profile?.tenant_id}
        </Text>
      </Card>
      <Button title={t("auth.signOut")} variant="destructive" onPress={() => void signOut()} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, gap: 16 },
  name: { fontSize: 20, fontWeight: "700" },
});
