import { Pressable, Text, Platform, type PressableProps } from "react-native";
import { twMerge } from "tailwind-merge";

const buttonStyles = {
  primary: "bg-tf-purple",
  secondary: "bg-tf-bg-secondary border border-tf-purple",
  ghost: "bg-transparent active:bg-tf-bg-tertiary",
  outline: "border border-tf-purple",
  danger: "bg-tf-error",
  success: "bg-tf-success",
};

const textStyles = {
  primary: "text-white",
  secondary: "text-tf-text-primary",
  ghost: "text-tf-text-secondary",
  outline: "text-tf-purple",
  danger: "text-white",
  success: "text-white",
};

export type ButtonVariant = keyof typeof buttonStyles;

export interface ButtonProps extends Omit<PressableProps, "children"> {
  variant?: ButtonVariant;
  children: React.ReactNode;
  className?: string;
}

const getShadowStyle = (variant: ButtonVariant) => {
  if (variant === "ghost") {
    return {};
  }

  const shadowColor = "#000000";
  const shadowOpacity = 0.3;
  const shadowRadius = 4;
  const shadowOffset = { width: 0, height: 2 };
  const elevation = 3;

  if (Platform.OS === "ios") {
    return {
      shadowColor,
      shadowOffset,
      shadowOpacity,
      shadowRadius,
    };
  } else {
    return {
      elevation,
    };
  }
};

export function Button({
  variant = "primary",
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const variantClasses = buttonStyles[variant];
  const textColorClasses = textStyles[variant];
  const baseClasses = "px-4 py-2 rounded-lg items-center justify-center";
  const disabledClasses = disabled ? "opacity-50" : "";
  const combinedClasses = twMerge(
    baseClasses,
    variantClasses,
    disabledClasses,
    className
  );

  const shadowStyle = getShadowStyle(variant);

  return (
    <Pressable
      className={combinedClasses}
      disabled={disabled}
      style={shadowStyle}
      {...props}
    >
      {typeof children === "string" ? (
        <Text className={twMerge("font-semibold", textColorClasses)}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
