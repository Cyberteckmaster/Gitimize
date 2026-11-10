"use client";

import { forwardRef, ReactNode } from "react";
import { cn } from "./utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, icon, iconPosition = "left", fullWidth, children, disabled, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
    
    const variants = {
      primary: "bg-primary text-white hover:bg-primary-hover focus-visible:ring-primary",
      secondary: "bg-secondary text-white hover:bg-secondary-hover focus-visible:ring-secondary",
      accent: "bg-accent text-white hover:bg-accent-hover focus-visible:ring-accent",
      outline: "bg-transparent border border-outline hover:bg-surface-variant focus-visible:ring-outline",
      ghost: "bg-transparent hover:bg-surface-variant focus-visible:ring-outline",
      destructive: "bg-error text-white hover:bg-error/90 focus-visible:ring-error",
    };
    
    const sizes = {
      sm: "px-3 py-1.5 text-xs gap-1.5",
      md: "px-4 py-2.5 text-sm gap-2",
      lg: "px-6 py-3 text-base gap-2",
    };
    
    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], fullWidth && "w-full", className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M12 2a10 10 0 0 1 10 10A10 10 0 0 1 12 2z" />
          </svg>
        )}
        {icon && iconPosition === "left" && !loading && <span>{icon}</span>}
        {children}
        {icon && iconPosition === "right" && !loading && <span>{icon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="label">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "input",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error && "border-error focus:border-error focus:ring-error/20",
              className
            )}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-sm text-error" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-on-surface-variant">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="label">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn("input min-h-[100px] resize-y", error && "border-error focus:border-error focus:ring-error/20", className)}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-sm text-error" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-on-surface-variant">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "outlined";
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", padding = "md", hover = false, children, ...props }, ref) => {
    const variants = {
      default: "bg-surface-elevated border border-outline-variant rounded-xl shadow-sm transition-shadow hover:shadow-md",
      elevated: "bg-surface-elevated border border-outline-variant rounded-xl shadow-lg",
      outlined: "bg-transparent border border-outline rounded-xl",
    };
    
    const paddings = {
      none: "",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    };
    
    return (
      <div
        ref={ref}
        className={cn(variants[variant], paddings[padding], hover && "hover:shadow-lg transition-shadow cursor-pointer", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "success" | "warning" | "error" | "info" | "default";
  size?: "sm" | "md";
  dot?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", size = "md", dot, children, ...props }, ref) => {
    const variants = {
      primary: "bg-primary-light text-primary",
      secondary: "bg-secondary/10 text-secondary",
      success: "bg-success-container text-success",
      warning: "bg-warning-container text-warning",
      error: "bg-error-container text-error",
      info: "bg-info-container text-info",
      default: "bg-surface-variant text-on-surface-variant",
    };
    
    const sizes = {
      sm: "px-2 py-0.5 text-xs",
      md: "px-2.5 py-0.5 text-xs",
    };
    
    return (
      <span
        ref={ref}
        className={cn("inline-flex items-center gap-1.5 font-medium rounded-full", variants[variant], sizes[size], className)}
        {...props}
      >
        {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export interface TabsProps {
  tabs: Array<{ id: string; label: string; icon?: ReactNode; disabled?: boolean }>;
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({ tabs, defaultTab, onChange, children, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || "");
  
  const handleChange = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };
  
  return (
    <div className={cn("w-full", className)}>
      <div className="flex gap-1 border-b border-outline-variant mb-6 overflow-x-auto scrollbar-thin pb-[-1px]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && handleChange(tab.id)}
            disabled={tab.disabled}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-all",
              "whitespace-nowrap",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant/50",
              tab.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {tab.icon && <span>{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>
      <div>{children}</div>
    </div>
  );
}

export interface TabPanelProps {
  tabId: string;
  activeTab: string;
  children: ReactNode;
}

export function TabPanel({ tabId, activeTab, children }: TabPanelProps) {
  if (activeTab !== tabId) return null;
  return <div role="tabpanel" id={tabId}>{children}</div>;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, options, placeholder, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");
    
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="label">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn("input appearance-none bg-surface-elevated", error && "border-error focus:border-error focus:ring-error/20", className)}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
          {...props}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={`${selectId}-error`} className="mt-1.5 text-sm text-error" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${selectId}-hint`} className="mt-1.5 text-sm text-on-surface-variant">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  variant?: "primary" | "secondary" | "success" | "warning" | "error";
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, size = "md", showLabel = false, variant = "primary", ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    
    const variants = {
      primary: "bg-primary",
      secondary: "bg-secondary",
      success: "bg-success",
      warning: "bg-warning",
      error: "bg-error",
    };
    
    const sizes = {
      sm: "h-1.5",
      md: "h-2.5",
      lg: "h-4",
    };
    
    return (
      <div ref={ref} className={cn("w-full bg-surface-variant rounded-full overflow-hidden", sizes[size], className)} {...props}>
        <div
          className={cn(variants[variant], "h-full rounded-full transition-all duration-300 ease-out")}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
        {showLabel && (
          <div className="flex justify-between mt-1 text-xs text-on-surface-variant">
            <span>{Math.round(percentage)}%</span>
            <span>{value} / {max}</span>
          </div>
        )}
      </div>
    );
  }
);

Progress.displayName = "Progress";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: boolean;
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "info", title, dismissible, onDismiss, icon = true, children, ...props }, ref) => {
    const variants = {
      info: "bg-info-container border-info/30 text-on-surface",
      success: "bg-success-container border-success/30 text-on-surface",
      warning: "bg-warning-container border-warning/30 text-on-surface",
      error: "bg-error-container border-error/30 text-on-surface",
    };
    
    const icons = {
      info: "ℹ️",
      success: "✅",
      warning: "⚠️",
      error: "❌",
    };
    
    return (
      <div
        ref={ref}
        className={cn("flex gap-3 p-4 rounded-lg border", variants[variant], className)}
        role="alert"
        {...props}
      >
        {icon && <span className="text-lg flex-shrink-0">{icons[variant]}</span>}
        <div className="flex-1 min-w-0">
          {title && <h4 className="font-medium mb-1">{title}</h4>}
          <div className="text-sm">{children}</div>
        </div>
        {dismissible && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 hover:bg-black/10 rounded transition-colors"
            aria-label="Dismiss"
          >
            ✕
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = "Alert";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  shape?: "circle" | "square";
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, name, size = "md", shape = "circle", ...props }, ref) => {
    const sizes = {
      xs: "w-6 h-6 text-xs",
      sm: "w-8 h-8 text-sm",
      md: "w-10 h-10 text-base",
      lg: "w-12 h-12 text-lg",
      xl: "w-16 h-16 text-xl",
    };
    
    const getInitials = (name: string) => {
      return name
        .split(" ")
        .map(n => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    };
    
    const colors = [
      "bg-primary", "bg-secondary", "bg-accent", "bg-success",
      "bg-warning", "bg-error", "bg-info",
    ];
    
    const colorIndex = name ? name.split("").reduce((a, b) => a + b.charCodeAt(0), 0) % colors.length : 0;
    
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium text-white rounded-full overflow-hidden",
          sizes[size],
          shape === "square" && "rounded-lg",
          className
        )}
        {...props}
      >
        {src ? (
          <img src={src} alt={alt || name || "Avatar"} className="w-full h-full object-cover" />
        ) : name ? (
          <span className={cn(colors[colorIndex], "w-full h-full")}>
            {getInitials(name)}
          </span>
        ) : (
          <svg className="w-full h-full text-on-surface-variant/50" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        )}
      </div>
    );
  }
);

Avatar.displayName = "Avatar";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

export function Tooltip({ content, children, position = "top", delay = 200 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const show = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  };
  
  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };
  
  return (
    <div className="relative inline-block" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {visible && (
        <div
          className={cn(
            "absolute z-50 px-3 py-2 text-xs text-white bg-on-surface rounded-lg shadow-lg whitespace-nowrap animate-fade-in",
            position === "top" && "bottom-full left-1/2 -translate-x-1/2 mb-2",
            position === "bottom" && "top-full left-1/2 -translate-x-1/2 mt-2",
            position === "left" && "right-full top-1/2 -translate-y-1/2 mr-2",
            position === "right" && "left-full top-1/2 -translate-y-1/2 ml-2",
          )}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  );
}

import { useState, useRef } from "react";
import { cn } from "./utils";