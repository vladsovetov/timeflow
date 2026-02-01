import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { usePostApiV1Timers, getGetApiV1TimersQueryKey } from "@acme/api-client";
import type { CreateTimerRequest } from "@acme/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import * as SecureStore from "expo-secure-store";
import { TimerForm, useTimerForm } from "@/src/components/TimerForm/TimerForm";
import { Button } from "@/src/components/Button/Button";
import { useTranslation } from "@/src/i18n";

const COLOR_PICKER_STORAGE_KEY = "selected_color_temp";

const TIMER_COLOR_PALETTE = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

function pickRandomColor(): string {
  return TIMER_COLOR_PALETTE[Math.floor(Math.random() * TIMER_COLOR_PALETTE.length)];
}

export default function CreateTimerScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const initialColor = useMemo(() => pickRandomColor(), []);
  const form = useTimerForm({ color: initialColor }, false);

  // Handle color selection from color picker
  useFocusEffect(
    useCallback(() => {
      const checkSelectedColor = async () => {
        const selectedColor = await SecureStore.getItemAsync(COLOR_PICKER_STORAGE_KEY);
        if (selectedColor) {
          form.setValue("color", selectedColor);
          // Clear the stored color
          await SecureStore.deleteItemAsync(COLOR_PICKER_STORAGE_KEY);
        }
      };
      checkSelectedColor();
    }, [form])
  );

  const createMutation = usePostApiV1Timers({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetApiV1TimersQueryKey() });
        router.back();
      },
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    if (typeof data.timer_type !== "string" || typeof data.name !== "string") return;
    const payload: CreateTimerRequest = {
      timer_type: data.timer_type,
      name: data.name,
    };
    if (data.category_id != null && data.category_id !== "") payload.category_id = data.category_id;
    payload.color = (data.color != null && data.color !== "") ? data.color : pickRandomColor();
    if (data.min_time_minutes != null && data.min_time_minutes > 0) {
      payload.min_time = data.min_time_minutes * 60;
    }
    if (typeof data.is_archived === "boolean") payload.is_archived = data.is_archived;
    createMutation.mutate({ data: payload });
  });

  return (
    <View className="flex-1 bg-tf-bg-primary">
      <TimerForm form={form} isUpdate={false} />
      <View className="px-6 pb-6" style={{ paddingBottom: 24 + insets.bottom }}>
        <Button
          variant="primary"
          onPress={onSubmit}
          disabled={createMutation.isPending}
          className="w-full"
        >
          {createMutation.isPending ? t("creating") : t("createTimer")}
        </Button>
      </View>
    </View>
  );
}
