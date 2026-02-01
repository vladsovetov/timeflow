import { View, Text, ScrollView, TouchableOpacity, Switch } from "react-native";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useForm, Controller, UseFormReturn } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TextInput } from "@/src/components/TextInput/TextInput";
import {
  useGetApiV1TimerCategories,
  usePostApiV1TimerCategories,
} from "@acme/api-client";
import { useQueryClient } from "@tanstack/react-query";
import type { CreateTimerRequest, UpdateTimerRequest } from "@acme/api-client";
import * as SecureStore from "expo-secure-store";
import { useTranslation } from "@/src/i18n";

function getTimerTypes(t: (key: string) => string) {
  return [
    { key: "work", name: t("timerType_work"), description: t("timerType_work_desc"), sort_order: 0, icon: "briefcase" as const },
    { key: "study", name: t("timerType_study"), description: t("timerType_study_desc"), sort_order: 1, icon: "book" as const },
    { key: "exercise", name: t("timerType_exercise"), description: t("timerType_exercise_desc"), sort_order: 2, icon: "barbell" as const },
    { key: "break", name: t("timerType_break"), description: t("timerType_break_desc"), sort_order: 3, icon: "cafe" as const },
    { key: "personal", name: t("timerType_personal"), description: t("timerType_personal_desc"), sort_order: 4, icon: "person" as const },
    { key: "focus", name: t("timerType_focus"), description: t("timerType_focus_desc"), sort_order: 5, icon: "flash" as const },
    { key: "meeting", name: t("timerType_meeting"), description: t("timerType_meeting_desc"), sort_order: 6, icon: "people" as const },
    { key: "hobby", name: t("timerType_hobby"), description: t("timerType_hobby_desc"), sort_order: 7, icon: "color-palette" as const },
    { key: "health", name: t("timerType_health"), description: t("timerType_health_desc"), sort_order: 8, icon: "medical" as const },
    { key: "sleep", name: t("timerType_sleep"), description: t("timerType_sleep_desc"), sort_order: 9, icon: "moon" as const },
    { key: "other", name: t("timerType_other"), description: t("timerType_other_desc"), sort_order: 10, icon: "ellipsis-horizontal" as const },
  ];
}

function createTimerSchema(t: (key: string) => string) {
  return yup.object({
    timer_type: yup.string().min(1, t("timerTypeRequired")).required(),
    category_id: yup.string().uuid(t("selectCategory")).required(t("categoryRequired")),
    name: yup.string().min(1, t("nameRequired")).required(),
    color: yup.string().optional(),
    sort_order: yup.number().optional().default(0),
    min_time_minutes: yup.number().nullable().min(0).optional().transform((v) => (v === "" || v == null ? null : v)),
    is_archived: yup.boolean().optional().default(false),
  });
}

function updateTimerSchema() {
  return yup.object({
    timer_type: yup.string().min(1).optional(),
    category_id: yup.string().uuid().nullable().optional(),
    name: yup.string().min(1).optional(),
    color: yup.string().optional(),
    sort_order: yup.number().optional(),
    min_time_minutes: yup.number().nullable().min(0).optional().transform((v) => (v === "" || v == null ? null : v)),
    is_archived: yup.boolean().optional(),
  });
}

export type TimerFormData = CreateTimerRequest | UpdateTimerRequest;

export type TimerFormValues = TimerFormData & {
  category_id?: string | null;
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
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const timerTypes = useMemo(() => getTimerTypes(t), [t]);
  const { data: categoriesData } = useGetApiV1TimerCategories();
  const categories = categoriesData?.status === 200 ? categoriesData.data.data : [];
  const createCategoryMutation = usePostApiV1TimerCategories({
    mutation: {
      onSuccess: (res) => {
        if (res.status === 201 && res.data.data) {
          queryClient.invalidateQueries({ queryKey: ["/api/v1/timer-categories"] });
          form.setValue("category_id", res.data.data.id);
          setShowAddCategory(false);
          setNewCategoryName("");
          setNewCategoryColor("#3b82f6");
        }
      },
    },
  });
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#3b82f6");

  useEffect(() => {
    const first = categories[0];
    if (!isUpdate && first && !form.getValues("category_id")) {
      form.setValue("category_id", first.id);
    }
  }, [categories, isUpdate, form]);

  useFocusEffect(
    useCallback(() => {
      const checkCategoryColor = async () => {
        const categoryColor = await SecureStore.getItemAsync("selected_category_color_temp");
        if (showAddCategory && categoryColor) {
          setNewCategoryColor(categoryColor);
          await SecureStore.deleteItemAsync("selected_category_color_temp");
        }
      };
      checkCategoryColor();
    }, [showAddCategory])
  );

  return (
    <ScrollView className="flex-1 bg-tf-bg-primary">
      <View className="px-6 py-6">
        <Controller
          control={control}
          name="timer_type"
          render={({ field: { onChange, value } }) => (
            <View className="mb-4">
              <Text className="text-tf-text-primary text-sm mb-2">
                {t("timerType")} *
              </Text>
              <View className="bg-tf-input-bg border border-tf-input-border rounded-xl">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row p-2">
                    {timerTypes.map((type) => (
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
          name="category_id"
          render={({ field: { onChange, value } }) => (
            <View className="mb-4">
              <Text className="text-tf-text-primary text-sm mb-2">
                {t("category")} *
              </Text>
              <View className="bg-tf-input-bg border border-tf-input-border rounded-xl">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row p-2">
                    {categories.filter((c): c is NonNullable<typeof c> => c != null).map((cat) => {
                      const isSelected = value === cat.id;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          onPress={() => onChange(cat.id)}
                          className={`px-4 py-2 rounded-lg mr-2 flex-row items-center ${
                            isSelected ? "" : "bg-tf-bg-secondary"
                          }`}
                          style={
                            isSelected
                              ? { backgroundColor: cat.color }
                              : undefined
                          }
                        >
                          <View
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: cat.color }}
                          />
                          <Text
                            className={isSelected ? "text-white font-medium" : "text-tf-text-secondary"}
                          >
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    <TouchableOpacity
                      onPress={() => setShowAddCategory(!showAddCategory)}
                      className="px-4 py-2 rounded-lg flex-row items-center bg-tf-bg-secondary border border-dashed border-tf-input-border"
                    >
                      <Ionicons name="add" size={18} color="#8A8DB3" />
                      <Text className="text-tf-text-secondary ml-1">
                        {t("addCustom")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
              {showAddCategory && (
                <View className="mt-3 p-3 bg-tf-bg-secondary rounded-xl border border-tf-input-border">
                  <Text className="text-tf-text-primary text-sm mb-2">
                    {t("newCategory")}
                  </Text>
                  <View className="flex-row gap-2 mb-2">
                    <View className="flex-1">
                      <TextInput
                        variant="default"
                        placeholder={t("name")}
                        value={newCategoryName}
                        onChangeText={setNewCategoryName}
                      />
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        router.push({
                          pathname: "/(root)/timers/color-picker",
                          params: { color: newCategoryColor, forCategory: "1" },
                        });
                      }}
                      className="w-12 h-12 rounded-lg justify-center items-center"
                      style={{ backgroundColor: newCategoryColor }}
                    />
                  </View>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => {
                        setShowAddCategory(false);
                        setNewCategoryName("");
                        setNewCategoryColor("#3b82f6");
                      }}
                      className="flex-1 py-2 rounded-lg bg-tf-bg-tertiary items-center"
                    >
                      <Text className="text-tf-text-secondary">{t("cancel")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        if (newCategoryName.trim()) {
                          createCategoryMutation.mutate({
                            data: {
                              name: newCategoryName.trim(),
                              color: newCategoryColor,
                            },
                          });
                        }
                      }}
                      disabled={
                        !newCategoryName.trim() || createCategoryMutation.isPending
                      }
                      className="flex-1 py-2 rounded-lg bg-tf-purple items-center"
                    >
                      <Text className="text-white">
                        {createCategoryMutation.isPending ? t("adding") : t("add")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {errors.category_id && (
                <Text className="text-tf-error text-xs mt-1">
                  {errors.category_id.message}
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
              <Text className="text-tf-text-primary text-sm mb-2">{t("name")} *</Text>
              <TextInput
                variant="default"
                placeholder={t("enterTimerName")}
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
              <Text className="text-tf-text-primary text-sm mb-2">{t("color")}</Text>
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
                {t("sortOrder")}
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
                {t("minTimeMinutes")}
              </Text>
              <TextInput
                variant="default"
                placeholder={t("minTimePlaceholder")}
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
                {t("minTimeHint")}
              </Text>
            </View>
          )}
        />

        <Controller
          control={control}
          name="is_archived"
          render={({ field: { onChange, value } }) => (
            <View className="mb-6 flex-row items-center justify-between">
              <Text className="text-tf-text-primary text-sm">{t("archived")}</Text>
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
  const { t } = useTranslation();
  const schema = useMemo(
    () => (isUpdate ? updateTimerSchema() : createTimerSchema(t)),
    [isUpdate, t]
  );

  return useForm<TimerFormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      timer_type: defaultValues?.timer_type ?? "",
      category_id: defaultValues?.category_id ?? undefined,
      name: defaultValues?.name ?? "",
      color: defaultValues?.color ?? "",
      sort_order: defaultValues?.sort_order ?? 0,
      min_time_minutes: defaultValues?.min_time_minutes ?? null,
      is_archived: defaultValues?.is_archived ?? false,
    },
  });
}
