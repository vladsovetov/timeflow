import { View, Text, ScrollView, TouchableOpacity, Switch } from "react-native";
import { useForm, Controller, UseFormReturn } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { TextInput } from "@/src/components/TextInput/TextInput";
import type { CreateTimerRequest, UpdateTimerRequest } from "@acme/api-client";

const TIMER_TYPES = [
  "work",
  "study",
  "exercise",
  "break",
  "personal",
  "focus",
  "meeting",
  "hobby",
  "health",
  "sleep",
  "other",
];

const createSchema = yup.object({
  timer_type: yup.string().min(1, "Timer type is required").required(),
  name: yup.string().min(1, "Name is required").required(),
  color: yup.string().optional(),
  sort_order: yup.number().optional().default(0),
  is_archived: yup.boolean().optional().default(false),
});

const updateSchema = yup.object({
  timer_type: yup.string().min(1).optional(),
  name: yup.string().min(1).optional(),
  color: yup.string().optional(),
  sort_order: yup.number().optional(),
  is_archived: yup.boolean().optional(),
});

export type TimerFormData = CreateTimerRequest | UpdateTimerRequest;

interface TimerFormProps {
  form: UseFormReturn<TimerFormData>;
  isUpdate?: boolean;
}

export function TimerForm({ form, isUpdate = false }: TimerFormProps) {
  const {
    control,
    formState: { errors },
  } = form;

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
                        key={type}
                        onPress={() => onChange(type)}
                        className={`px-4 py-2 rounded-lg mr-2 ${
                          value === type
                            ? "bg-tf-purple"
                            : "bg-tf-bg-secondary"
                        }`}
                      >
                        <Text
                          className={`${
                            value === type
                              ? "text-white"
                              : "text-tf-text-secondary"
                          } capitalize`}
                        >
                          {type}
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
              <View className="flex-row items-center">
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
                  />
                </View>
              </View>
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
  defaultValues?: Partial<TimerFormData>,
  isUpdate = false
) {
  const schema = isUpdate ? updateSchema : createSchema;

  return useForm<TimerFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      timer_type: defaultValues?.timer_type ?? "",
      name: defaultValues?.name ?? "",
      color: defaultValues?.color ?? "",
      sort_order: defaultValues?.sort_order ?? 0,
      is_archived: defaultValues?.is_archived ?? false,
    },
  });
}
