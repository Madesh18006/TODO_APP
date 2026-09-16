"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  const callbackUrl = "/tasks";
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
      callbackUrl,
    });

    if (!result?.ok) {
      setError("Email or password is incorrect.");
      setPending(false);
      return;
    }

    window.location.assign(result.url ?? callbackUrl);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
          Todo
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
          Welcome back
        </h1>
        <p className="mt-2 text-slate-600">Sign in to manage your tasks.</p>
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              required
              name="email"
              type="text"
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
              autoComplete="current-password"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            disabled={pending}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          Need an account?{" "}
          <Link className="font-semibold text-indigo-600" href="/register">
            Create one
          </Link>
        </p>
      </section>
    </main>
  );
}
