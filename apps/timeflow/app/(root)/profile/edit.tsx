import { View, Text, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import SelectDropdown from "react-native-select-dropdown";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetApiV1Me,
  usePatchApiV1Me,
  getGetApiV1MeQueryKey,
} from "@acme/api-client";
import { TextInput } from "@/src/components/TextInput/TextInput";
import { Button } from "@/src/components/Button/Button";
import type { UpdateProfileRequest } from "@acme/api-client";
import { useTranslation } from "@/src/i18n";
import { SUPPORTED_LOCALES } from "@/src/i18n";

// Comprehensive list of IANA timezones (React Native doesn't support Intl.supportedValuesOf)
const IANA_TIMEZONES = [
  "Africa/Abidjan", "Africa/Accra", "Africa/Addis_Ababa", "Africa/Algiers", "Africa/Asmara",
  "Africa/Bamako", "Africa/Bangui", "Africa/Banjul", "Africa/Bissau", "Africa/Blantyre",
  "Africa/Brazzaville", "Africa/Bujumbura", "Africa/Cairo", "Africa/Casablanca", "Africa/Ceuta",
  "Africa/Conakry", "Africa/Dakar", "Africa/Dar_es_Salaam", "Africa/Djibouti", "Africa/Douala",
  "Africa/El_Aaiun", "Africa/Freetown", "Africa/Gaborone", "Africa/Harare", "Africa/Johannesburg",
  "Africa/Juba", "Africa/Kampala", "Africa/Khartoum", "Africa/Kigali", "Africa/Kinshasa",
  "Africa/Lagos", "Africa/Libreville", "Africa/Lome", "Africa/Luanda", "Africa/Lubumbashi",
  "Africa/Lusaka", "Africa/Malabo", "Africa/Maputo", "Africa/Maseru", "Africa/Mbabane",
  "Africa/Mogadishu", "Africa/Monrovia", "Africa/Nairobi", "Africa/Ndjamena", "Africa/Niamey",
  "Africa/Nouakchott", "Africa/Ouagadougou", "Africa/Porto-Novo", "Africa/Sao_Tome", "Africa/Tripoli",
  "Africa/Tunis", "Africa/Windhoek", "America/Adak", "America/Anchorage", "America/Anguilla",
  "America/Antigua", "America/Araguaina", "America/Argentina/Buenos_Aires", "America/Argentina/Catamarca",
  "America/Argentina/Cordoba", "America/Argentina/Jujuy", "America/Argentina/La_Rioja",
  "America/Argentina/Mendoza", "America/Argentina/Rio_Gallegos", "America/Argentina/Salta",
  "America/Argentina/San_Juan", "America/Argentina/San_Luis", "America/Argentina/Tucuman",
  "America/Argentina/Ushuaia", "America/Aruba", "America/Asuncion", "America/Atikokan",
  "America/Bahia", "America/Bahia_Banderas", "America/Barbados", "America/Belem", "America/Belize",
  "America/Blanc-Sablon", "America/Boa_Vista", "America/Bogota", "America/Boise", "America/Cambridge_Bay",
  "America/Campo_Grande", "America/Cancun", "America/Caracas", "America/Cayenne", "America/Cayman",
  "America/Chicago", "America/Chihuahua", "America/Costa_Rica", "America/Creston", "America/Cuiaba",
  "America/Curacao", "America/Danmarkshavn", "America/Dawson", "America/Dawson_Creek", "America/Denver",
  "America/Detroit", "America/Dominica", "America/Edmonton", "America/Eirunepe", "America/El_Salvador",
  "America/Fort_Nelson", "America/Fortaleza", "America/Glace_Bay", "America/Godthab", "America/Goose_Bay",
  "America/Grand_Turk", "America/Grenada", "America/Guadeloupe", "America/Guatemala", "America/Guayaquil",
  "America/Guyana", "America/Halifax", "America/Havana", "America/Hermosillo", "America/Indiana/Indianapolis",
  "America/Indiana/Knox", "America/Indiana/Marengo", "America/Indiana/Petersburg", "America/Indiana/Tell_City",
  "America/Indiana/Vevay", "America/Indiana/Vincennes", "America/Indiana/Winamac", "America/Inuvik",
  "America/Iqaluit", "America/Jamaica", "America/Juneau", "America/Kentucky/Louisville",
  "America/Kentucky/Monticello", "America/Kralendijk", "America/La_Paz", "America/Lima", "America/Los_Angeles",
  "America/Lower_Princes", "America/Maceio", "America/Managua", "America/Manaus", "America/Marigot",
  "America/Martinique", "America/Matamoros", "America/Mazatlan", "America/Menominee", "America/Merida",
  "America/Metlakatla", "America/Mexico_City", "America/Miquelon", "America/Moncton", "America/Monterrey",
  "America/Montevideo", "America/Montserrat", "America/Nassau", "America/New_York", "America/Nipigon",
  "America/Nome", "America/Noronha", "America/North_Dakota/Beulah", "America/North_Dakota/Center",
  "America/North_Dakota/New_Salem", "America/Ojinaga", "America/Panama", "America/Pangnirtung",
  "America/Paramaribo", "America/Phoenix", "America/Port-au-Prince", "America/Port_of_Spain",
  "America/Porto_Velho", "America/Puerto_Rico", "America/Punta_Arenas", "America/Rainy_River",
  "America/Rankin_Inlet", "America/Recife", "America/Regina", "America/Resolute", "America/Rio_Branco",
  "America/Santarem", "America/Santiago", "America/Santo_Domingo", "America/Sao_Paulo", "America/Scoresbysund",
  "America/Sitka", "America/St_Barthelemy", "America/St_Johns", "America/St_Kitts", "America/St_Lucia",
  "America/St_Thomas", "America/St_Vincent", "America/Swift_Current", "America/Tegucigalpa", "America/Thule",
  "America/Thunder_Bay", "America/Tijuana", "America/Toronto", "America/Tortola", "America/Vancouver",
  "America/Whitehorse", "America/Winnipeg", "America/Yakutat", "America/Yellowknife", "Antarctica/Casey",
  "Antarctica/Davis", "Antarctica/DumontDUrville", "Antarctica/Macquarie", "Antarctica/Mawson",
  "Antarctica/McMurdo", "Antarctica/Palmer", "Antarctica/Rothera", "Antarctica/Syowa", "Antarctica/Troll",
  "Antarctica/Vostok", "Arctic/Longyearbyen", "Asia/Aden", "Asia/Almaty", "Asia/Amman", "Asia/Anadyr",
  "Asia/Aqtau", "Asia/Aqtobe", "Asia/Ashgabat", "Asia/Atyrau", "Asia/Baghdad", "Asia/Bahrain", "Asia/Baku",
  "Asia/Bangkok", "Asia/Barnaul", "Asia/Beirut", "Asia/Bishkek", "Asia/Brunei", "Asia/Chita", "Asia/Choibalsan",
  "Asia/Colombo", "Asia/Damascus", "Asia/Dhaka", "Asia/Dili", "Asia/Dubai", "Asia/Dushanbe", "Asia/Famagusta",
  "Asia/Gaza", "Asia/Hebron", "Asia/Ho_Chi_Minh", "Asia/Hong_Kong", "Asia/Hovd", "Asia/Irkutsk", "Asia/Jakarta",
  "Asia/Jayapura", "Asia/Jerusalem", "Asia/Kabul", "Asia/Kamchatka", "Asia/Karachi", "Asia/Kathmandu",
  "Asia/Khandyga", "Asia/Kolkata", "Asia/Krasnoyarsk", "Asia/Kuala_Lumpur", "Asia/Kuching", "Asia/Kuwait",
  "Asia/Macau", "Asia/Magadan", "Asia/Makassar", "Asia/Manila", "Asia/Muscat", "Asia/Nicosia", "Asia/Novokuznetsk",
  "Asia/Novosibirsk", "Asia/Omsk", "Asia/Oral", "Asia/Phnom_Penh", "Asia/Pontianak", "Asia/Pyongyang",
  "Asia/Qatar", "Asia/Qostanay", "Asia/Qyzylorda", "Asia/Riyadh", "Asia/Sakhalin", "Asia/Samarkand",
  "Asia/Seoul", "Asia/Shanghai", "Asia/Singapore", "Asia/Srednekolymsk", "Asia/Taipei", "Asia/Tashkent",
  "Asia/Tbilisi", "Asia/Tehran", "Asia/Thimphu", "Asia/Tokyo", "Asia/Tomsk", "Asia/Ulaanbaatar", "Asia/Urumqi",
  "Asia/Ust-Nera", "Asia/Vientiane", "Asia/Vladivostok", "Asia/Yakutsk", "Asia/Yangon", "Asia/Yekaterinburg",
  "Asia/Yerevan", "Atlantic/Azores", "Atlantic/Bermuda", "Atlantic/Canary", "Atlantic/Cape_Verde",
  "Atlantic/Faroe", "Atlantic/Madeira", "Atlantic/Reykjavik", "Atlantic/South_Georgia", "Atlantic/St_Helena",
  "Atlantic/Stanley", "Australia/Adelaide", "Australia/Brisbane", "Australia/Broken_Hill", "Australia/Currie",
  "Australia/Darwin", "Australia/Eucla", "Australia/Hobart", "Australia/Lindeman", "Australia/Lord_Howe",
  "Australia/Melbourne", "Australia/Perth", "Australia/Sydney", "Europe/Amsterdam", "Europe/Andorra",
  "Europe/Astrakhan", "Europe/Athens", "Europe/Belgrade", "Europe/Berlin", "Europe/Bratislava",
  "Europe/Brussels", "Europe/Bucharest", "Europe/Budapest", "Europe/Busingen", "Europe/Chisinau",
  "Europe/Copenhagen", "Europe/Dublin", "Europe/Gibraltar", "Europe/Guernsey", "Europe/Helsinki",
  "Europe/Isle_of_Man", "Europe/Istanbul", "Europe/Jersey", "Europe/Kaliningrad", "Europe/Kiev",
  "Europe/Kirov", "Europe/Lisbon", "Europe/Ljubljana", "Europe/London", "Europe/Luxembourg", "Europe/Madrid",
  "Europe/Malta", "Europe/Mariehamn", "Europe/Minsk", "Europe/Monaco", "Europe/Moscow", "Europe/Oslo",
  "Europe/Paris", "Europe/Podgorica", "Europe/Prague", "Europe/Riga", "Europe/Rome", "Europe/Samara",
  "Europe/San_Marino", "Europe/Sarajevo", "Europe/Saratov", "Europe/Simferopol", "Europe/Skopje",
  "Europe/Sofia", "Europe/Stockholm", "Europe/Tallinn", "Europe/Tirane", "Europe/Ulyanovsk", "Europe/Uzhgorod",
  "Europe/Vaduz", "Europe/Vatican", "Europe/Vienna", "Europe/Vilnius", "Europe/Volgograd", "Europe/Warsaw",
  "Europe/Zagreb", "Europe/Zaporozhye", "Europe/Zurich", "Indian/Antananarivo", "Indian/Chagos",
  "Indian/Christmas", "Indian/Cocos", "Indian/Comoro", "Indian/Kerguelen", "Indian/Mahe", "Indian/Maldives",
  "Indian/Mauritius", "Indian/Mayotte", "Indian/Reunion", "Pacific/Apia", "Pacific/Auckland", "Pacific/Bougainville",
  "Pacific/Chatham", "Pacific/Chuuk", "Pacific/Easter", "Pacific/Efate", "Pacific/Enderbury", "Pacific/Fakaofo",
  "Pacific/Fiji", "Pacific/Funafuti", "Pacific/Galapagos", "Pacific/Gambier", "Pacific/Guadalcanal",
  "Pacific/Guam", "Pacific/Honolulu", "Pacific/Kiritimati", "Pacific/Kosrae", "Pacific/Kwajalein",
  "Pacific/Majuro", "Pacific/Marquesas", "Pacific/Midway", "Pacific/Nauru", "Pacific/Niue", "Pacific/Norfolk",
  "Pacific/Noumea", "Pacific/Pago_Pago", "Pacific/Palau", "Pacific/Pitcairn", "Pacific/Pohnpei",
  "Pacific/Port_Moresby", "Pacific/Rarotonga", "Pacific/Saipan", "Pacific/Tahiti", "Pacific/Tarawa",
  "Pacific/Tongatapu", "Pacific/Wake", "Pacific/Wallis", "UTC"
];

const TIMEZONES = IANA_TIMEZONES.map((tz) => ({
  value: tz,
  label: tz.replace(/_/g, " "),
})).sort((a, b) => a.label.localeCompare(b.label));

const profileSchema = yup.object({
  first_name: yup.string().optional().transform((v) => (v === "" || v == null ? undefined : v)),
  last_name: yup.string().optional().transform((v) => (v === "" || v == null ? undefined : v)),
  timezone: yup.string().optional().transform((v) => (v === "" || v == null ? undefined : v)),
  language: yup
    .string()
    .nullable()
    .optional()
    .transform((v) => (v === "" ? null : v)),
});

type ProfileFormValues = UpdateProfileRequest;

const LANGUAGE_OPTIONS = [
  { value: "", labelKey: "languageDevice" as const },
  ...SUPPORTED_LOCALES.map((code) => ({ value: code, labelKey: `language_${code}` as const })),
];

export default function EditProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: profileData, isLoading: isLoadingProfile } = useGetApiV1Me();
  const updateProfile = usePatchApiV1Me();

  const profile = profileData?.status === 200 ? profileData.data : null;

  const languages = LANGUAGE_OPTIONS.map((opt) => ({
    value: opt.value,
    label: t(opt.labelKey),
  }));

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      first_name: undefined,
      last_name: undefined,
      timezone: undefined,
      language: undefined,
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        first_name: profile.first_name ?? undefined,
        last_name: profile.last_name ?? undefined,
        timezone: profile.timezone ?? undefined,
        language: profile.language ?? null,
      });
    }
  }, [profile, reset]);

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      const result = await updateProfile.mutateAsync({
        data: {
          ...data,
          language:
            data.language === "" || data.language === null
              ? null
              : data.language ?? undefined,
        },
      });
      if (result.status === 200) {
        await queryClient.invalidateQueries({ queryKey: getGetApiV1MeQueryKey() });
        router.back();
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
    }
  };

  if (isLoadingProfile) {
    return (
      <View className="flex-1 bg-tf-bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text className="text-tf-text-secondary mt-4">{t("loadingProfile")}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-tf-bg-primary"
    >
      <ScrollView className="flex-1">
        <View className="px-6 py-6">
          <Controller
            control={control}
            name="first_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <View className="mb-4">
                <Text className="text-tf-text-primary text-sm mb-2">{t("firstName")}</Text>
                <TextInput
                  variant="default"
                  placeholder={t("enterFirstName")}
                  value={value ?? ""}
                  onChangeText={(text) => onChange(text || undefined)}
                  onBlur={onBlur}
                  error={errors.first_name?.message}
                />
              </View>
            )}
          />

          <Controller
            control={control}
            name="last_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <View className="mb-4">
                <Text className="text-tf-text-primary text-sm mb-2">{t("lastName")}</Text>
                <TextInput
                  variant="default"
                  placeholder={t("enterLastName")}
                  value={value ?? ""}
                  onChangeText={(text) => onChange(text || undefined)}
                  onBlur={onBlur}
                  error={errors.last_name?.message}
                />
              </View>
            )}
          />

          <Controller
            control={control}
            name="timezone"
            render={({ field: { onChange, onBlur, value } }) => {
              const selectedTimezone = value ? TIMEZONES.find((tz) => tz.value === value) : null;
              return (
                <View className="mb-6">
                  <Text className="text-tf-text-primary text-sm mb-2">{t("timezone")}</Text>
                  <SelectDropdown
                    data={TIMEZONES}
                    onSelect={(selectedItem) => {
                      onChange(selectedItem?.value ?? undefined);
                      onBlur();
                    }}
                    defaultValue={selectedTimezone}
                    search={true}
                    searchInputStyle={{
                      backgroundColor: "#1A1B23",
                      borderRadius: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: "#2A2B33",
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                    }}
                    searchInputTxtColor="#FFFFFF"
                    searchPlaceHolder={t("searchTimezone")}
                    searchPlaceHolderColor="#8A8DB3"
                    renderButton={(selectedItem, isOpened) => (
                      <View
                        style={{
                          width: "100%",
                          height: 48,
                          backgroundColor: "#1A1B23",
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: errors.timezone ? "#EF4444" : "#2A2B33",
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: 12,
                          justifyContent: "space-between",
                        }}
                      >
                        <Text
                          style={{
                            color: selectedItem ? "#FFFFFF" : "#8A8DB3",
                            fontSize: 16,
                            flex: 1,
                          }}
                        >
                          {selectedItem ? selectedItem.label : t("selectTimezone")}
                        </Text>
                        <Text style={{ color: "#8A8DB3", fontSize: 16 }}>
                          {isOpened ? "▲" : "▼"}
                        </Text>
                      </View>
                    )}
                    renderItem={(item, index, isSelected) => (
                      <View
                        style={{
                          backgroundColor: isSelected ? "#2A2B33" : "#1A1B23",
                          borderBottomWidth: 1,
                          borderBottomColor: "#2A2B33",
                          paddingHorizontal: 12,
                          paddingVertical: 12,
                        }}
                      >
                        <Text
                          style={{
                            color: isSelected ? "#7C3AED" : "#FFFFFF",
                            fontSize: 16,
                          }}
                        >
                          {item.label}
                        </Text>
                      </View>
                    )}
                    dropdownStyle={{
                      backgroundColor: "#1A1B23",
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#2A2B33",
                    }}
                    dropdownOverlayColor="rgba(0, 0, 0, 0.5)"
                  />
                  {errors.timezone && (
                    <Text className="text-tf-error text-xs mt-1">
                      {errors.timezone.message}
                    </Text>
                  )}
                </View>
              );
            }}
          />

          <Controller
            control={control}
            name="language"
            render={({ field: { onChange, onBlur, value } }) => {
              const formValue = value ?? "";
              const selectedLanguage = languages.find((l) => l.value === formValue) ?? null;
              return (
                <View className="mb-6">
                  <Text className="text-tf-text-primary text-sm mb-2">{t("language")}</Text>
                  <SelectDropdown
                    data={languages}
                    onSelect={(selectedItem) => {
                      onChange(selectedItem?.value ?? "");
                      onBlur();
                    }}
                    defaultValue={selectedLanguage}
                    renderButton={(selectedItem, isOpened) => (
                      <View
                        style={{
                          width: "100%",
                          height: 48,
                          backgroundColor: "#1A1B23",
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: errors.language ? "#EF4444" : "#2A2B33",
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: 12,
                          justifyContent: "space-between",
                        }}
                      >
                        <Text
                          style={{
                            color: selectedItem ? "#FFFFFF" : "#8A8DB3",
                            fontSize: 16,
                            flex: 1,
                          }}
                        >
                          {selectedItem ? selectedItem.label : t("selectLanguage")}
                        </Text>
                        <Text style={{ color: "#8A8DB3", fontSize: 16 }}>
                          {isOpened ? "▲" : "▼"}
                        </Text>
                      </View>
                    )}
                    renderItem={(item, index, isSelected) => (
                      <View
                        style={{
                          backgroundColor: isSelected ? "#2A2B33" : "#1A1B23",
                          borderBottomWidth: 1,
                          borderBottomColor: "#2A2B33",
                          paddingHorizontal: 12,
                          paddingVertical: 12,
                        }}
                      >
                        <Text
                          style={{
                            color: isSelected ? "#7C3AED" : "#FFFFFF",
                            fontSize: 16,
                          }}
                        >
                          {item.label}
                        </Text>
                      </View>
                    )}
                    dropdownStyle={{
                      backgroundColor: "#1A1B23",
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#2A2B33",
                    }}
                    dropdownOverlayColor="rgba(0, 0, 0, 0.5)"
                  />
                  {errors.language && (
                    <Text className="text-tf-error text-xs mt-1">
                      {errors.language.message}
                    </Text>
                  )}
                </View>
              );
            }}
          />

          <View className="flex-row gap-3">
            <Button
              variant="secondary"
              onPress={() => router.back()}
              disabled={isSubmitting}
              className="flex-1"
            >
              {t("cancel")}
            </Button>
            <Button
              variant="primary"
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                t("save")
              )}
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
