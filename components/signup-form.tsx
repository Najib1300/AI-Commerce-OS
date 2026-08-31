"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field, Submit } from "@/components/auth-form";
import { readJsonResponse } from "@/lib/http";

interface SignupResponse { redirectTo: string }

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setPending(true);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      });
      const result = await readJsonResponse<SignupResponse>(response);
      router.push(result.redirectTo);
      router.refresh();
    } catch (cause) {
      console.error("Signup request failed", cause);
      setError("Unable to create account. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return <form onSubmit={onSubmit} className="mt-6 grid gap-4">
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <Field label="Full name" name="fullName" autoComplete="name"/>
    <Field label="Email" name="email" type="email" autoComplete="email"/>
    <Field label="Password" name="password" type="password" autoComplete="new-password"/>
    <Submit disabled={pending}>{pending ? "Creating account…" : "Create account"}</Submit>
  </form>;
}
