"use client";

import { useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import LogoutButton from "@/components/LogoutButton";

type DateFormat = "system" | "month-first" | "day-first";

const dateFormatKey = "todo-date-format";
const notificationsKey = "todo-notifications";

export default function SettingsPage() {
  const [dateFormat, setDateFormat] = useState<DateFormat>(() => {
    if (typeof window === "undefined") return "system";
    const stored = window.localStorage.getItem(dateFormatKey);
    return stored === "month-first" || stored === "day-first" ? stored : "system";
  });
  const [notifications, setNotifications] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(notificationsKey);
    return stored === null ? true : stored === "true";
  });
  const [saved, setSaved] = useState(false);

  function savePreferences() {
    window.localStorage.setItem(dateFormatKey, dateFormat);
    window.localStorage.setItem(notificationsKey, String(notifications));
    setSaved(true);
  }

  return (
    <main className="settings-page">
      <div className="settings-card">
        <div className="settings-header">
          <div>
            <Link className="back-link" href="/tasks">← Back to tasks</Link>
            <p className="eyebrow">Workspace</p>
            <h1>Settings</h1>
            <p className="subheading">Choose how Momentum works for you. Preferences are saved in this browser.</p>
          </div>
          <LogoutButton />
        </div>
        <section className="settings-section">
          <h2>Appearance</h2>
          <p className="muted">Use your system preference or choose a theme.</p>
          <ThemeToggle />
        </section>
        <section className="settings-section">
          <h2>Task display</h2>
          <label className="settings-field">
            Date format
            <select value={dateFormat} onChange={(event) => setDateFormat(event.target.value as DateFormat)}>
              <option value="system">System default</option>
              <option value="month-first">Month first (Dec 31, 2026)</option>
              <option value="day-first">Day first (31 Dec 2026)</option>
            </select>
          </label>
        </section>
        <section className="settings-section">
          <h2>Notifications</h2>
          <label className="settings-checkbox">
            <input type="checkbox" checked={notifications} onChange={(event) => setNotifications(event.target.checked)} />
            <span>Show task reminders and activity updates</span>
          </label>
        </section>
        <div className="settings-actions">
          {saved && <span className="muted" role="status">Preferences saved.</span>}
          <button className="primary-button" type="button" onClick={savePreferences}>Save preferences</button>
        </div>
      </div>
    </main>
  );
}
