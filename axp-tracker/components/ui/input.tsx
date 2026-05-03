import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", error, ...props }, ref) => (
    <input
      ref={ref}
      className={[
        "block w-full rounded-md border px-3 py-2 text-sm text-gray-900",
        "placeholder:text-gray-400 bg-white",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
        "disabled:opacity-50 disabled:bg-gray-50",
        error ? "border-red-400" : "border-gray-300",
        className,
      ].join(" ")}
      {...props}
    />
  )
);
Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", error, ...props }, ref) => (
    <textarea
      ref={ref}
      className={[
        "block w-full rounded-md border px-3 py-2 text-sm text-gray-900",
        "placeholder:text-gray-400 bg-white resize-none",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
        "disabled:opacity-50 disabled:bg-gray-50",
        error ? "border-red-400" : "border-gray-300",
        className,
      ].join(" ")}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
