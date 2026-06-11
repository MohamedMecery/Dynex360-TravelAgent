import { useState } from "react";
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "@/hooks/useAuth";
import { useRtl } from "@/hooks/useRtl";
import { useTranslation } from "@/i18n/LocaleProvider";
import type { RootStackParamList } from "@/navigation/types";
import { useTheme } from "@/theme/useTheme";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { textAlign } = useRtl();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      navigation.replace("Main", { screen: "Home" });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("auth.signInFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text, textAlign }]}>{t("app.name")}</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text, textAlign }]}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder={t("auth.email")}
        placeholderTextColor={colors.textMuted}
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text, textAlign }]}
        secureTextEntry
        placeholder={t("auth.password")}
        placeholderTextColor={colors.textMuted}
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={[styles.error, { textAlign }]}>{error}</Text> : null}
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Button title={t("auth.signIn")} onPress={() => void onSubmit()} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  error: {
    color: "#b91c1c",
  },
});
