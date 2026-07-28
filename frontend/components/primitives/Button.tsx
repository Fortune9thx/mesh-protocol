"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "destructive" | "disabled" | "ghost";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}

const base =
  "font-mono uppercase tracking-[0.1em] text-[11px] px-[22px] py-[11px] border transition-colors duration-150 ease-out cursor-pointer select-none";

const variants: Record<Variant, string> = {
  primary: "border-white/26 text-bone hover:bg-white/6",
  secondary: "border-white/14 text-[#8a8a86] hover:bg-white/4",
  destructive: "border-[oklch(45%_0.09_30)] text-[oklch(65%_0.1_30)] hover:bg-[oklch(20%_0.04_30)]",
  disabled: "border-white/10 text-[#5f5f5b] cursor-default",
  ghost: "border-transparent text-signal hover:underline px-0 py-0",
};

export function Button({ variant = "primary", children, className = "", disabled, ...rest }: ButtonProps) {
  const isDisabled = disabled || variant === "disabled";
  return (
    <button
      {...rest}
      disabled={isDisabled}
      className={`${base} ${variants[isDisabled ? "disabled" : variant]} ${className}`}
    >
      {children}
    </button>
  );
}
