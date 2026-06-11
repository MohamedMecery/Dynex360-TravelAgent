import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useRtl } from "@/hooks/useRtl";
import { useTranslation } from "@/i18n/LocaleProvider";
import { useTheme } from "@/theme/useTheme";

interface TimePickerFieldProps {
  label?: string;
  value: string | null | undefined;
  onChange: (time: string | null) => void;
}

function parseTime(value: string | null | undefined): Date {
  const d = new Date();
  if (value && /^\d{2}:\d{2}/.test(value)) {
    const [h, m] = value.split(":").map(Number);
    d.setHours(h, m, 0, 0);
  }
  return d;
}

function formatTime(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function TimePickerField({ label, value, onChange }: TimePickerFieldProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { textAlign } = useRtl();
  const [open, setOpen] = useState(false);
  const date = parseTime(value);

  const onPickerChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setOpen(false);
    if (selected) onChange(formatTime(selected));
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
          {value ?? t("common.selectTime")}
        </Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={date}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onPickerChange}
        />
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
});
