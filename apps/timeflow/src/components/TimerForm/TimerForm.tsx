import { View, Text, ScrollView, TouchableOpacity, Switch } from "react-native";
import { useForm, Controller, UseFormReturn } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TextInput } from "@/src/components/TextInput/TextInput";
import type { CreateTimerRequest, UpdateTimerRequest } from "@acme/api-client";

const TIMER_TYPES = [
  { key: "work", name: "Work", description: "Work-related activities", sort_order: 0, icon: "briefcase" as const },
  { key: "study", name: "Study", description: "Learning and studying", sort_order: 1, icon: "book" as const },
  { key: "exercise", name: "Exercise", description: "Physical exercise and fitness", sort_order: 2, icon: "barbell" as const },
  { key: "break", name: "Break", description: "Rest and relaxation breaks", sort_order: 3, icon: "cafe" as const },
  { key: "personal", name: "Personal", description: "Personal activities", sort_order: 4, icon: "person" as const },
  { key: "focus", name: "Focus", description: "Focused work sessions", sort_order: 5, icon: "flash" as const },
  { key: "meeting", name: "Meeting", description: "Meetings and discussions", sort_order: 6, icon: "people" as const },
  { key: "hobby", name: "Hobby", description: "Hobbies and interests", sort_order: 7, icon: "color-palette" as const },
  { key: "health", name: "Health", description: "Health-related activities", sort_order: 8, icon: "medical" as const },
  { key: "sleep", name: "Sleep", description: "Sleep and rest", sort_order: 9, icon: "moon" as const },
  { key: "other", name: "Other", description: "Other activities", sort_order: 10, icon: "ellipsis-horizontal" as const },
];

const createSchema = yup.object({
  timer_type: yup.string().min(1, "Timer type is required").required(),
  name: yup.string().min(1, "Name is required").required(),
  color: yup.string().optional(),
  sort_order: yup.number().optional().default(0),
  min_time_minutes: yup.number().nullable().min(0).optional().transform((v) => (v === "" || v == null ? null : v)),
  is_archived: yup.boolean().optional().default(false),
});

const updateSchema = yup.object({
  timer_type: yup.string().min(1).optional(),
  name: yup.string().min(1).optional(),
  color: yup.string().optional(),
  sort_order: yup.number().optional(),
  min_time_minutes: yup.number().nullable().min(0).optional().transform((v) => (v === "" || v == null ? null : v)),
  is_archived: yup.boolean().optional(),
});

export type TimerFormData = CreateTimerRequest | UpdateTimerRequest;

export type TimerFormValues = TimerFormData & {
  min_time_minutes?: number | null;
};

interface TimerFormProps {
  form: UseFormReturn<TimerFormValues>;
  isUpdate?: boolean;
}

export function TimerForm({ form, isUpdate = false }: TimerFormProps) {
  const {
    control,
    formState: { errors },
  } = form;
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-tf-bg-primary">
      <View className="px-6 py-6">
        <Controller
          control={control}
          name="timer_type"
          render={({ field: { onChange, value } }) => (
            <View className="mb-4">
              <Text className="text-tf-text-primary text-sm mb-2">
                Timer Type *
              </Text>
              <View className="bg-tf-input-bg border border-tf-input-border rounded-xl">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row p-2">
                    {TIMER_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type.key}
                        onPress={() => onChange(type.key)}
                        className={`px-4 py-2 rounded-lg mr-2 flex-row items-center ${
                          value === type.key
                            ? "bg-tf-purple"
                            : "bg-tf-bg-secondary"
                        }`}
                      >
                        <Ionicons
                          name={type.icon}
                          size={18}
                          color={value === type.key ? "#ffffff" : "#8A8DB3"}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          className={`${
                            value === type.key
                              ? "text-white"
                              : "text-tf-text-secondary"
                          }`}
                        >
                          {type.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
              {errors.timer_type && (
                <Text className="text-tf-error text-xs mt-1">
                  {errors.timer_type.message}
                </Text>
              )}
            </View>
          )}
        />

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <View className="mb-4">
              <Text className="text-tf-text-primary text-sm mb-2">Name *</Text>
              <TextInput
                variant="default"
                placeholder="Enter timer name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
              />
            </View>
          )}
        />

        <Controller
          control={control}
          name="color"
          render={({ field: { onChange, onBlur, value } }) => (
            <View className="mb-4">
              <Text className="text-tf-text-primary text-sm mb-2">Color</Text>
              <TouchableOpacity
                onPress={() => {
                  router.push({
                    pathname: "/(root)/timers/color-picker",
                    params: { color: value || "#3b82f6" },
                  });
                }}
                className="flex-row items-center"
              >
                {value && (
                  <View
                    className="w-8 h-8 rounded-full mr-3 border border-tf-input-border"
                    style={{ backgroundColor: value }}
                  />
                )}
                <View className="flex-1">
                  <TextInput
                    variant="default"
                    placeholder="#3b82f6"
                    value={value ?? ""}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    autoCapitalize="none"
                    editable={false}
                  />
                </View>
              </TouchableOpacity>
            </View>
          )}
        />

        <Controller
          control={control}
          name="sort_order"
          render={({ field: { onChange, onBlur, value } }) => (
            <View className="mb-4">
              <Text className="text-tf-text-primary text-sm mb-2">
                Sort Order
              </Text>
              <TextInput
                variant="default"
                placeholder="0"
                keyboardType="numeric"
                value={value?.toString() ?? "0"}
                onChangeText={(text) => {
                  const num = parseInt(text, 10);
                  onChange(isNaN(num) ? 0 : num);
                }}
                onBlur={onBlur}
              />
            </View>
          )}
        />

        <Controller
          control={control}
          name="min_time_minutes"
          render={({ field: { onChange, onBlur, value } }) => (
            <View className="mb-4">
              <Text className="text-tf-text-primary text-sm mb-2">
                Min time (minutes)
              </Text>
              <TextInput
                variant="default"
                placeholder="e.g. 30"
                keyboardType="numeric"
                value={value != null ? value.toString() : ""}
                onChangeText={(text) => {
                  if (text === "") {
                    onChange(null);
                    return;
                  }
                  const num = parseInt(text, 10);
                  onChange(isNaN(num) ? null : num);
                }}
                onBlur={onBlur}
              />
              <Text className="text-tf-text-secondary text-xs mt-1">
                Optional. Daily goal in minutes. Shows a progress bar on the timer card.
              </Text>
            </View>
          )}
        />

        <Controller
          control={control}
          name="is_archived"
          render={({ field: { onChange, value } }) => (
            <View className="mb-6 flex-row items-center justify-between">
              <Text className="text-tf-text-primary text-sm">Archived</Text>
              <Switch
                value={value ?? false}
                onValueChange={onChange}
                trackColor={{ false: "#1A1A33", true: "#7C3AED" }}
                thumbColor={value ? "#fff" : "#8A8DB3"}
              />
            </View>
          )}
        />
      </View>
    </ScrollView>
  );
}

export function useTimerForm(
  defaultValues?: Partial<TimerFormValues>,
  isUpdate = false
) {
  const schema = isUpdate ? updateSchema : createSchema;

  return useForm<TimerFormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      timer_type: defaultValues?.timer_type ?? "",
      name: defaultValues?.name ?? "",
      color: defaultValues?.color ?? "",
      sort_order: defaultValues?.sort_order ?? 0,
      min_time_minutes: defaultValues?.min_time_minutes ?? null,
      is_archived: defaultValues?.is_archived ?? false,
    },
  });
}
