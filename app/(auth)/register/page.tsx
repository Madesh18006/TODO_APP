"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
        displayName: formData.get("displayName"),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as {
        error?: { message?: string };
      };
      setError(payload.error?.message ?? "Unable to create your account.");
      setPending(false);
      return;
    }

    router.push("/login?registered=1");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
          Todo
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
          Create your account
        </h1>
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700">
            Display name
            <input
              required
              name="displayName"
              maxLength={100}
              autoComplete="name"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              required
              name="email"
              type="email"
              autoComplete="email"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              required
              name="password"
              type="password"
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            disabled={pending}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Creating account..." : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          Already registered?{" "}
          <Link className="font-semibold text-indigo-600" href="/login">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
