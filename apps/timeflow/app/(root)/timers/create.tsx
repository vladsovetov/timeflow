import { View } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { usePostApiV1Timers, getGetApiV1TimersQueryKey } from "@acme/api-client";
import type { CreateTimerRequest } from "@acme/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import { TimerForm, useTimerForm } from "@/src/components/TimerForm/TimerForm";
import { Button } from "@/src/components/Button/Button";
import { useTranslation } from "@/src/i18n";

const COLOR_PICKER_STORAGE_KEY = "selected_color_temp";

export default function CreateTimerScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const form = useTimerForm(undefined, false);

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
    if (data.color != null && data.color !== "") payload.color = data.color;
    if (typeof data.sort_order === "number") payload.sort_order = data.sort_order;
    if (data.min_time_minutes != null && data.min_time_minutes > 0) {
      payload.min_time = data.min_time_minutes * 60;
    }
    if (typeof data.is_archived === "boolean") payload.is_archived = data.is_archived;
    createMutation.mutate({ data: payload });
  });

  return (
    <View className="flex-1 bg-tf-bg-primary">
      <TimerForm form={form} isUpdate={false} />
      <View className="px-6 pb-6">
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
