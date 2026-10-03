"use client";
import { useState } from "react";
import { inputCls } from "./form";
import { Eye, EyeOff } from "./icons";

export function PasswordInput({ name, autoComplete, placeholder, minLength }: { name: string; autoComplete: string; placeholder?: string; minLength?: number }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input name={name} type={show ? "text" : "password"} autoComplete={autoComplete} required minLength={minLength} maxLength={72}
        placeholder={placeholder} className={`${inputCls} pr-12`} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}
        className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground hover:text-foreground">
        {show ? <EyeOff /> : <Eye />}
      </button>
    </div>
  );
}
