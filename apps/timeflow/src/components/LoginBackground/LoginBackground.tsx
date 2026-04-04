import { Image, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { twMerge } from "tailwind-merge";

const gradientSource = require("../../../assets/login/vibrant-gradient-glowing-particles.png");
const lockSource = require("../../../assets/login/glowing-clock-checklist-dreamy-hues.png");

/**
 * Vertical shift of the lock artwork in px (negative = move up).
 * The PNG is 1024×1536; the illustration often sits low in the frame with a lot of
 * empty/gradient space above—so `top: 0` lines up the *file* top, not the *visible* art.
 * Prefer cropping the asset; use this only until then.
 */
const LOGIN_LOCK_IMAGE_TRANSLATE_Y = 0;

interface LoginBackgroundProps {
  className?: string;
}

export function LoginBackground({ className }: LoginBackgroundProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={twMerge("absolute inset-0 w-full", className)}
      pointerEvents="none"
    >
      <View className="absolute inset-0 bg-tf-bg-primary" />

      <Image
        source={gradientSource}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        className="absolute inset-0 h-full w-full"
      />

      <View
        className="absolute left-0 right-0 top-[180px] z-10 items-center"
      >
        <Image
          source={lockSource}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          className="w-[72%] max-w-[240px] aspect-[1024/1536]"
          style={
            LOGIN_LOCK_IMAGE_TRANSLATE_Y !== 0
              ? { transform: [{ translateY: LOGIN_LOCK_IMAGE_TRANSLATE_Y }] }
              : undefined
          }
        />
      </View>
    </View>
  );
}
