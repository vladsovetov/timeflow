import { View, Text, ActivityIndicator, Alert } from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import {
  useGetApiV1TimersId,
  usePatchApiV1TimersId,
  useDeleteApiV1TimersId,
  type UpdateTimerRequest,
} from "@acme/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { TimerForm, useTimerForm } from "@/src/components/TimerForm/TimerForm";
import { Button } from "@/src/components/Button/Button";
import { useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";

const COLOR_PICKER_STORAGE_KEY = "selected_color_temp";

export default function EditTimerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

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
        sort_order: timer.sort_order,
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
        queryClient.invalidateQueries({ queryKey: ["/api/v1/timers"] });
        queryClient.invalidateQueries({
          queryKey: ["/api/v1/timers", id],
        });
        router.back();
      },
    },
  });

  const deleteMutation = useDeleteApiV1TimersId({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/v1/timers"] });
        router.back();
      },
    },
  });

  const handleDelete = () => {
    Alert.alert(
      "Delete Timer",
      "Are you sure you want to delete this timer? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
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
      sort_order: data.sort_order,
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
        <Text className="text-tf-text-secondary mt-4">Loading timer...</Text>
      </View>
    );
  }

  if (error || !timer) {
    return (
      <View className="flex-1 bg-tf-bg-primary items-center justify-center px-6">
        <Text className="text-tf-error text-center mb-4">
          {error?.error ?? "Timer not found"}
        </Text>
        <Button variant="primary" onPress={() => router.back()}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-tf-bg-primary">
      <TimerForm form={form} isUpdate={true} />
      <View className="px-6 pb-6 flex-row gap-3">
        <Button
          variant="danger"
          onPress={handleDelete}
          disabled={deleteMutation.isPending}
          className="flex-1"
        >
          {deleteMutation.isPending ? "Deleting..." : "Delete"}
        </Button>
        <Button
          variant="primary"
          onPress={onSubmit}
          disabled={updateMutation.isPending}
          className="flex-1"
        >
          {updateMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </View>
    </View>
  );
}
