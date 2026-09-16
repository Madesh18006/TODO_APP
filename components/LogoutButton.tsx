"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      className="secondary-button logout-button"
      type="button"
      onClick={() => void signOut({ callbackUrl: "/login" })}
    >
      Log out
    </button>
  );
}
