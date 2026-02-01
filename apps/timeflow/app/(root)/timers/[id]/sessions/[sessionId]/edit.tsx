import { View, Text, ActivityIndicator, ScrollView, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  useGetApiV1TimerSessionsId,
  useGetApiV1TimerSessions,
  usePatchApiV1TimerSessionsId,
  getGetApiV1TimerSessionsQueryKey,
  getGetApiV1TimerSessionsIdQueryKey,
  getGetApiV1TimersQueryKey,
  getGetApiV1TimersIdQueryKey,
} from "@acme/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/src/components/Button/Button";
import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { DateTime } from "luxon";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useUserTimezone } from "@/src/contexts/AppContext";
import { parseDateTime } from "@/src/lib/date";

const editSessionSchema = yup.object({
  started_at: yup.string().required("Start time is required"),
  ended_at: yup
    .string()
    .nullable()
    .test("after-start", "End time must be after start time", function (value) {
      if (value == null || value === "") return true;
      const { started_at } = this.parent;
      return !!started_at && value > started_at;
    }),
});

type EditSessionFormValues = yup.InferType<typeof editSessionSchema>;

function applyPickedTimeToIso(
  isoString: string,
  pickedDate: Date,
  zone: string
): string {
  const dt = DateTime.fromJSDate(pickedDate).setZone(zone);
  const current = parseDateTime(isoString, zone);
  const merged = current.set({
    hour: dt.hour,
    minute: dt.minute,
    second: 0,
    millisecond: 0,
  });
  const iso = merged.toUTC().toISO();
  return iso ?? isoString;
}

export default function EditSessionScreen() {
  const router = useRouter();
  const { id, sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();
  const queryClient = useQueryClient();
  const zone = useUserTimezone();

  const { data, isLoading, error } = useGetApiV1TimerSessionsId(sessionId ?? "");
  const session = data?.status === 200 ? data.data.data : null;

  const { data: sessionsListData } = useGetApiV1TimerSessions({
    query: { enabled: !!id && !!session },
  });
  const allSessions = sessionsListData?.status === 200 ? sessionsListData.data.data : [];
  const timerSessions = allSessions
    .filter((s) => s.timer_id === id)
    .sort(
      (a, b) =>
        DateTime.fromISO(a.started_at).toMillis() -
        DateTime.fromISO(b.started_at).toMillis()
    );
  const currentIndex = session
    ? timerSessions.findIndex((s) => s.id === session.id)
    : -1;
  const previousSession = currentIndex > 0 ? timerSessions[currentIndex - 1] : null;
  const nextSession =
    currentIndex >= 0 && currentIndex < timerSessions.length - 1
      ? timerSessions[currentIndex + 1]
      : null;

  const [pickerMode, setPickerMode] = useState<"start" | "end" | null>(null);

  const {
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditSessionFormValues>({
    defaultValues: { started_at: "", ended_at: null },
    resolver: yupResolver(editSessionSchema),
  });

  const startedAt = watch("started_at");
  const endedAt = watch("ended_at");

  useEffect(() => {
    if (session) {
      reset({
        started_at: session.started_at,
        ended_at: session.ended_at ?? null,
      });
    }
  }, [session, reset]);

  const updateMutation = usePatchApiV1TimerSessionsId({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetApiV1TimerSessionsQueryKey() });
        queryClient.invalidateQueries({
          queryKey: getGetApiV1TimerSessionsIdQueryKey(sessionId ?? ""),
        });
        queryClient.invalidateQueries({ queryKey: getGetApiV1TimersQueryKey() });
        if (id) {
          queryClient.invalidateQueries({ queryKey: getGetApiV1TimersIdQueryKey(id) });
        }
        router.back();
      },
    },
  });

  const onPickerConfirm = useCallback(
    (date: Date) => {
      if (pickerMode === "start" && startedAt) {
        setValue("started_at", applyPickedTimeToIso(startedAt, date, zone));
      } else if (pickerMode === "end") {
        const baseIso = endedAt ?? startedAt;
        if (baseIso) {
          setValue("ended_at", applyPickedTimeToIso(baseIso, date, zone));
        }
      }
      setPickerMode(null);
    },
    [pickerMode, startedAt, endedAt, zone, setValue]
  );

  const onSubmit = useCallback(
    (values: EditSessionFormValues) => {
      const startedIso = values.started_at;
      const endedIso = values.ended_at;
      updateMutation.mutate({
        id: sessionId ?? "",
        data: {
          started_at: startedIso,
          ended_at: endedIso,
        },
      });
    },
    [sessionId, updateMutation]
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-tf-bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text className="text-tf-text-secondary mt-4">Loading session...</Text>
      </View>
    );
  }

  if (error || !session) {
    return (
      <View className="flex-1 bg-tf-bg-primary items-center justify-center px-6">
        <Text className="text-tf-error text-center mb-4">
          {error?.error ?? "Session not found"}
        </Text>
        <Button variant="primary" onPress={() => router.back()}>
          Go Back
        </Button>
      </View>
    );
  }

  const startDateTime = startedAt ? parseDateTime(startedAt, zone) : null;
  const endDateTime = endedAt ? parseDateTime(endedAt, zone) : null;

  const pickerDate =
    pickerMode === "start"
      ? startDateTime?.toJSDate()
      : pickerMode === "end"
        ? (endDateTime ?? startDateTime)?.toJSDate()
        : DateTime.now().toJSDate();

  return (
    <View className="flex-1 bg-tf-bg-primary">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
        <Text className="text-tf-text-secondary text-sm mb-2">
          Times in your timezone ({zone}). Date cannot be changed.
        </Text>
        <Text className="text-tf-text-primary text-base mb-2">Start time</Text>
        <TouchableOpacity
          className="h-12 px-4 rounded-xl bg-tf-input-bg border border-tf-input-border justify-center mb-4"
          onPress={() => setPickerMode("start")}
          activeOpacity={0.7}
        >
          <Text className="text-tf-text-primary text-base">
            {startDateTime ? startDateTime.toFormat("HH:mm") : "—"}
          </Text>
        </TouchableOpacity>
        {errors.started_at ? (
          <Text className="text-tf-error text-sm mb-2">{errors.started_at.message}</Text>
        ) : null}
        <Text className="text-tf-text-primary text-base mb-2">End time</Text>
        <TouchableOpacity
          className="h-12 px-4 rounded-xl bg-tf-input-bg border border-tf-input-border justify-center mb-4"
          onPress={() => setPickerMode("end")}
          activeOpacity={0.7}
        >
          <Text className="text-tf-text-primary text-base">
            {endDateTime ? endDateTime.toFormat("HH:mm") : "Still active (tap to set)"}
          </Text>
        </TouchableOpacity>
        {errors.ended_at ? (
          <Text className="text-tf-error text-sm mb-4">{errors.ended_at.message}</Text>
        ) : null}
        {(previousSession ?? nextSession) ? (
          <View className="mb-6 rounded-xl bg-tf-input-bg border border-tf-input-border p-4">
            <Text className="text-tf-text-secondary text-xs mb-3">
              Time bounds (from adjacent sessions)
            </Text>
            {previousSession ? (
              <View className="mb-2">
                <Text className="text-tf-text-primary text-sm">
                  Previous session:{" "}
                  {parseDateTime(previousSession.started_at, zone).toFormat("HH:mm")}
                  {" – "}
                  {previousSession.ended_at
                    ? parseDateTime(previousSession.ended_at, zone).toFormat("HH:mm")
                    : "…"}
                </Text>
                <Text className="text-tf-text-secondary text-xs mt-0.5">
                  Start time cannot be before{" "}
                  {previousSession.ended_at
                    ? parseDateTime(previousSession.ended_at, zone).toFormat("HH:mm")
                    : "previous end"}
                </Text>
              </View>
            ) : null}
            {nextSession ? (
              <View>
                <Text className="text-tf-text-primary text-sm">
                  Next session:{" "}
                  {parseDateTime(nextSession.started_at, zone).toFormat("HH:mm")}
                  {" – "}
                  {nextSession.ended_at
                    ? parseDateTime(nextSession.ended_at, zone).toFormat("HH:mm")
                    : "…"}
                </Text>
                <Text className="text-tf-text-secondary text-xs mt-0.5">
                  End time cannot be after{" "}
                  {parseDateTime(nextSession.started_at, zone).toFormat("HH:mm")}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
        <Button
          variant="primary"
          onPress={handleSubmit(onSubmit)}
          disabled={updateMutation.isPending || isSubmitting}
        >
          {updateMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </ScrollView>
      <DateTimePickerModal
        isVisible={pickerMode !== null}
        mode="time"
        date={pickerDate ?? DateTime.now().toJSDate()}
        onConfirm={onPickerConfirm}
        onCancel={() => setPickerMode(null)}
      />
    </View>
  );
}
