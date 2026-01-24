import { Pressable, Text, type PressableProps } from "react-native";
import { twMerge } from "tailwind-merge";

const buttonStyles = {
  primary: "bg-tf-gradient text-white",
  secondary:
    "bg-tf-bg-secondary border border-tf-bg-tertiary text-tf-text-primary",
  ghost: "bg-transparent text-tf-text-secondary active:bg-tf-bg-tertiary",
  outline: "border border-tf-purple text-tf-purple",
  danger: "bg-tf-error text-white",
  success: "bg-tf-success text-white",
};

export type ButtonVariant = keyof typeof buttonStyles;

export interface ButtonProps extends Omit<PressableProps, "children"> {
  variant?: ButtonVariant;
  children: React.ReactNode;
  className?: string;
}

export function Button({
  variant = "primary",
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const variantClasses = buttonStyles[variant];
  const baseClasses = "px-4 py-2 rounded-lg items-center justify-center";
  const disabledClasses = disabled ? "opacity-50" : "";
  const combinedClasses = twMerge(
    baseClasses,
    variantClasses,
    disabledClasses,
    className
  );

  return (
    <Pressable className={combinedClasses} disabled={disabled} {...props}>
      {typeof children === "string" ? (
        <Text className="font-semibold">{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
