import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useRtl } from "@/hooks/useRtl";
import { useTranslation } from "@/i18n/LocaleProvider";
import { useTheme } from "@/theme/useTheme";

interface DatePickerFieldProps {
  label?: string;
  value: string | null | undefined;
  onChange: (isoDate: string | null) => void;
  minimumDate?: Date;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseDate(value: string | null | undefined): Date {
  if (value) {
    const parsed = new Date(`${value}T12:00:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

export function DatePickerField({
  label,
  value,
  onChange,
  minimumDate,
}: DatePickerFieldProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { textAlign } = useRtl();
  const [open, setOpen] = useState(false);
  const date = parseDate(value);

  const onPickerChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setOpen(false);
    if (selected) onChange(toIsoDate(selected));
  };

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={[styles.label, { color: colors.textMuted, textAlign }]}>{label}</Text>
      ) : null}
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.trigger, { borderColor: colors.border, backgroundColor: colors.surface }]}
      >
        <Text style={{ color: value ? colors.text : colors.textMuted, textAlign }}>
          {value ?? t("common.selectDate")}
        </Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={minimumDate}
          onChange={onPickerChange}
        />
      ) : null}
      {Platform.OS === "ios" && open ? (
        <Pressable onPress={() => setOpen(false)} style={styles.done}>
          <Text style={{ color: colors.primary, fontWeight: "600" }}>{t("common.done")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: "500" },
  trigger: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  done: { alignSelf: "flex-end", paddingVertical: 8 },
});
