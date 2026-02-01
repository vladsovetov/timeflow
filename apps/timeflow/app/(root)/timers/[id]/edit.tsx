import { View, Text, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import {
  useGetApiV1TimersId,
  usePatchApiV1TimersId,
  useDeleteApiV1TimersId,
  type UpdateTimerRequest,
  getGetApiV1TimersQueryKey,
  getGetApiV1TimersIdQueryKey,
} from "@acme/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { TimerForm, useTimerForm } from "@/src/components/TimerForm/TimerForm";
import { Button } from "@/src/components/Button/Button";
import { useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import { useTranslation } from "@/src/i18n";

const COLOR_PICKER_STORAGE_KEY = "selected_color_temp";

export default function EditTimerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const { data, isLoading, error } = useGetApiV1TimersId(id ?? "");

  const timer = data?.status === 200 ? data.data.data : null;

  const form = useTimerForm(undefined, true);

  useEffect(() => {
    if (timer) {
      form.reset({
        timer_type: timer.timer_type,
        category_id: timer.category_id ?? undefined,
        name: timer.name,
        color: timer.color ?? undefined,
        min_time_minutes: timer.min_time != null ? Math.round(timer.min_time / 60) : null,
        is_archived: timer.is_archived,
      });
    }
  }, [timer, form]);

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

  const updateMutation = usePatchApiV1TimersId({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetApiV1TimersQueryKey() });
        if (id) {
          queryClient.invalidateQueries({ queryKey: getGetApiV1TimersIdQueryKey(id) });
        }
        router.back();
      },
    },
  });

  const deleteMutation = useDeleteApiV1TimersId({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetApiV1TimersQueryKey() });
        router.back();
      },
    },
  });

  const handleDelete = () => {
    Alert.alert(
      t("deleteTimer"),
      t("deleteTimerConfirm"),
      [
        {
          text: t("cancel"),
          style: "cancel",
        },
        {
          text: t("delete"),
          style: "destructive",
          onPress: () => {
            if (id) {
              deleteMutation.mutate({ id });
            }
          },
        },
      ]
    );
  };

  const onSubmit = form.handleSubmit((data) => {
    if (!id) return;
    const payload: UpdateTimerRequest = {
      timer_type: data.timer_type,
      category_id: data.category_id ?? undefined,
      name: data.name,
      color: data.color ?? undefined,
      is_archived: data.is_archived,
      min_time:
        data.min_time_minutes != null && data.min_time_minutes > 0
          ? data.min_time_minutes * 60
          : null,
    };
    updateMutation.mutate({ id, data: payload });
  });

  if (isLoading) {
    return (
      <View className="flex-1 bg-tf-bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text className="text-tf-text-secondary mt-4">{t("loadingTimer")}</Text>
      </View>
    );
  }

  if (error || !timer) {
    return (
      <View className="flex-1 bg-tf-bg-primary items-center justify-center px-6">
        <Text className="text-tf-error text-center mb-4">
          {error?.error ?? t("timerNotFound")}
        </Text>
        <Button variant="primary" onPress={() => router.back()}>
          {t("goBack")}
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-tf-bg-primary">
      <TimerForm form={form} isUpdate={true} />
      <View className="px-6 flex-row gap-3" style={{ paddingBottom: 24 + insets.bottom }}>
        <Button
          variant="danger"
          onPress={handleDelete}
          disabled={deleteMutation.isPending}
          className="flex-1"
        >
          {deleteMutation.isPending ? t("deleting") : t("delete")}
        </Button>
        <Button
          variant="primary"
          onPress={onSubmit}
          disabled={updateMutation.isPending}
          className="flex-1"
        >
          {updateMutation.isPending ? t("saving") : t("save")}
        </Button>
      </View>
    </View>
  );
}
