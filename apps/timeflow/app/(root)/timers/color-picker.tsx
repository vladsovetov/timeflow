import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollView } from "react-native-gesture-handler";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import ColorPicker, {
  Panel1,
  Swatches,
  Preview,
  OpacitySlider,
  HueSlider,
} from "reanimated-color-picker";
import { Button } from "@/src/components/Button/Button";
import * as SecureStore from "expo-secure-store";

const COLOR_PICKER_STORAGE_KEY = "selected_color_temp";
const CATEGORY_COLOR_STORAGE_KEY = "selected_category_color_temp";

export default function ColorPickerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ color?: string; forCategory?: string }>();
  const insets = useSafeAreaInsets();
  const storageKey = params.forCategory === "1" ? CATEGORY_COLOR_STORAGE_KEY : COLOR_PICKER_STORAGE_KEY;
  const [selectedColor, setSelectedColor] = useState(params.color || "#3b82f6");

  const handleApply = async () => {
    await SecureStore.setItemAsync(storageKey, selectedColor);
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  const onSelectColor = ({ hex }: { hex: string }) => {
    setSelectedColor(hex);
  };

  return (
    <View className="flex-1 bg-tf-bg-primary">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        <ColorPicker
          value={selectedColor}
          onCompleteJS={onSelectColor}
          style={{ width: "100%" }}
        >
          <Preview />
          <Panel1 />
          <HueSlider />
          <OpacitySlider />
          <Swatches />
        </ColorPicker>
      </ScrollView>
      <View
        className="px-6 pt-4 border-t border-tf-input-border"
        style={{ paddingBottom: 24 + insets.bottom }}
      >
        <View className="flex-row gap-3">
          <Button
            variant="secondary"
            onPress={handleCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onPress={handleApply}
            className="flex-1"
          >
            Apply
          </Button>
        </View>
      </View>
    </View>
  );
}
