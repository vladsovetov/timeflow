import { TextInput as RNTextInput, type TextInputProps } from "react-native";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

export const textInputStyles = {
  // Default / most inputs
  default: `
    bg-tf-input-bg
    border border-tf-input-border
    text-tf-text-primary
    placeholder:text-tf-input-placeholder
  `,

  // Focused (apply conditionally)
  focused: `
    border-tf-input-focus
  `,

  // Has value / completed
  filled: `
    border-tf-input-filled
  `,

  // Read-only / disabled
  disabled: `
    bg-tf-input-disabledBg
    border border-tf-input-disabledBorder
    text-tf-input-disabledText
    placeholder:text-tf-input-disabledText
  `,

  // Validation error
  error: `
    border-tf-input-error
    text-tf-text-primary
  `,

  // Validation success (optional)
  success: `
    border-tf-input-success
  `,

  // Minimal / inline editing
  ghost: `
    bg-transparent
    border-b border-tf-input-border
    text-tf-text-primary
    placeholder:text-tf-input-placeholder
  `,
};

export type TextInputVariant = keyof typeof textInputStyles;

export interface TextInputComponentProps extends TextInputProps {
  variant?: TextInputVariant;
  className?: string;
  error?: string;
}

export function TextInput({
  variant = "default",
  className,
  editable = true,
  value,
  error,
  onFocus,
  onBlur,
  ...props
}: TextInputComponentProps) {
  const [isFocused, setIsFocused] = useState(false);

  const baseClasses = "h-12 px-4 rounded-xl text-base";
  const variantClasses = textInputStyles[variant];
  const hasValue = Boolean(value && value.length > 0);
  const isDisabled = !editable;

  const combinedClasses = twMerge(
    baseClasses,
    variantClasses,
    isFocused && textInputStyles.focused,
    hasValue && textInputStyles.filled,
    error && textInputStyles.error,
    isDisabled && textInputStyles.disabled,
    className
  );

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <RNTextInput
      className={combinedClasses}
      editable={editable}
      value={value}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...props}
    />
  );
}
