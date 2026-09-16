"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import LogoutButton from "@/components/LogoutButton";
import { getDemoTasks, DemoTask } from "@/lib/demo-data";

type Task = DemoTask;
type Option = { id: string; name: string };
type View = "overview" | "today" | "upcoming" | "completed" | "inbox" | "projects" | "tags";
type SortField = "updatedAt" | "createdAt" | "title" | "priority" | "dueDate";
type SortDirection = "asc" | "desc";
type FormState = {
  title: string;
  notes: string;
  status: Task["status"];
  priority: Task["priority"];
  dueDate: string;
  category: string;
  tags: string;
};

const emptyForm: FormState = {
  title: "",
  notes: "",
  status: "todo",
  priority: "none",
  dueDate: "",
  category: "",
  tags: "",
};
const demoStorageKey = "todo-demo-tasks";

function readDemoTasks(): Task[] {
  const stored = window.localStorage.getItem(demoStorageKey);
  if (!stored) {
    const seed = getDemoTasks();
    window.localStorage.setItem(demoStorageKey, JSON.stringify(seed));
    return seed;
  }
  try {
    return JSON.parse(stored) as Task[];
  } catch {
    const seed = getDemoTasks();
    window.localStorage.setItem(demoStorageKey, JSON.stringify(seed));
    return seed;
  }
}
function writeDemoTasks(tasks: Task[]) {
  window.localStorage.setItem(demoStorageKey, JSON.stringify(tasks));
}
async function readError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string | { message?: string } };
    if (typeof payload.error === "string") return payload.error;
    if (payload.error?.message) return payload.error.message;
  } catch {
    // Preserve the HTTP failure when the server did not return JSON.
  }
  return fallback;
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
function dateLabel(date: string | null) {
  if (!date) return "No due date";
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
function Icon({ name }: { name: "inbox" | "today" | "calendar" | "check" | "folder" | "tag" | "plus" | "search" | "menu" | "dots" | "sun" }) {
  const paths: Record<string, string> = {
    inbox: "M4 4h16v12H4z M4 12h4l2 3h4l2-3h4",
    today: "M5 5h14v14H5z M8 3v4m8-4v4M5 9h14",
    calendar: "M5 5h14v14H5z M8 3v4m8-4v4M5 9h14",
    check: "M5 12l4 4L19 6",
    folder: "M3 6h7l2 2h9v10H3z",
    tag: "M4 5v6l9 9 6-6-9-9H4z M8 9h.01",
    plus: "M12 5v14M5 12h14",
    search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm6-2 4 4",
    menu: "M4 6h16M4 12h16M4 18h16",
    dots: "M5 12h.01M12 12h.01M19 12h.01",
    sun: "M12 3v2m0 14v2M5.6 5.6l1.4 1.4m10 10 1.4 1.4M3 12h2m14 0h2M5.6 18.4 7 17m10-10 1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z",
  };
  return <svg aria-hidden="true" className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
}

export default function TaskDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [tags, setTags] = useState<Option[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [view, setView] = useState<View>("overview");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sort, setSort] = useState<SortField>("updatedAt");
  const [direction, setDirection] = useState<SortDirection>("desc");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);
      if (tagFilter) params.set("tag", tagFilter);
      params.set("sort", sort);
      params.set("direction", direction);
      if (view === "today") params.set("view", "today");
      if (view === "completed") params.set("view", "completed");
      if (view === "upcoming") params.set("view", "active");
      if (view === "inbox") params.set("view", "active");
      const response = await fetch(`/api/tasks?${params}`);
      if (response.status === 401) {
        const all = readDemoTasks();
        const filtered = all.filter((task) => {
          const text = `${task.title} ${task.notes ?? ""}`.toLowerCase();
          const matchesSearch = !search || text.includes(search.toLowerCase());
          const matchesView =
            view === "overview" || view === "projects" || view === "tags" ||
            (view === "today" && task.dueDate === today()) ||
            (view === "upcoming" && task.status !== "completed" && !!task.dueDate && task.dueDate >= today()) ||
            (view === "completed" && task.status === "completed") ||
            (view === "inbox" && !task.category);
          return matchesView && matchesSearch &&
            (!categoryFilter || task.category?.name.toLowerCase() === categoryFilter) &&
            (!tagFilter || task.tags.some((tag) => tag.name.toLowerCase() === tagFilter));
        });
        setDemoMode(true);
        const sorted = [...filtered].sort((a, b) => {
          const left = sort === "title" ? a.title : sort === "priority" ? a.priority : sort === "dueDate" ? (a.dueDate ?? "9999-12-31") : a.id;
          const right = sort === "title" ? b.title : sort === "priority" ? b.priority : sort === "dueDate" ? (b.dueDate ?? "9999-12-31") : b.id;
          return String(left).localeCompare(String(right)) * (direction === "asc" ? 1 : -1);
        });
        setTasks(sorted);
        setCategories([...new Map(all.flatMap((task) => task.category ? [task.category] : []).map((item) => [item.id, item])).values()]);
        setTags([...new Map(all.flatMap((task) => task.tags).map((item) => [item.id, item])).values()]);
        setCounts({
          todo: all.filter((task) => task.status === "todo").length,
          in_progress: all.filter((task) => task.status === "in_progress").length,
          completed: all.filter((task) => task.status === "completed").length,
        });
        return;
      }
      if (!response.ok) throw new Error("Could not load tasks.");
      const data = await response.json();
      setDemoMode(false);
      setTasks(data.tasks);
      setCategories(data.categories);
      setTags(data.tags);
      setCounts(data.counts);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load tasks.");
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, direction, search, sort, tagFilter, view]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 120);
    return () => window.clearTimeout(timer);
  }, [load]);

  const allCount = (counts.todo ?? 0) + (counts.in_progress ?? 0) + (counts.completed ?? 0);
  const activeCount = (counts.todo ?? 0) + (counts.in_progress ?? 0);
  const dueToday = tasks.filter((task) => task.dueDate === today()).length;
  const upcoming = tasks.filter((task) => task.status !== "completed" && task.dueDate && task.dueDate >= today());
  const title = view === "overview" ? "Good morning, Alex" :
    view === "projects" ? "Projects" : view === "tags" ? "Tags" :
    view[0].toUpperCase() + view.slice(1);

  function openEdit(task?: Task) {
    setEditing(task?.id ?? null);
    setEditorOpen(true);
    setForm(task ? {
      title: task.title, notes: task.notes ?? "", status: task.status, priority: task.priority,
      dueDate: task.dueDate ?? "", category: task.category?.name ?? "", tags: task.tags.map((item) => item.name).join(", "),
    } : emptyForm);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true); setError(""); setMessage("");
    try {
      if (demoMode) {
        const existing = readDemoTasks();
        const next: Task = {
          id: editing ?? crypto.randomUUID(), title: form.title.trim(), notes: form.notes.trim() || null,
          status: form.status, priority: form.priority, dueDate: form.dueDate || null,
          category: form.category.trim() ? { id: `category-${form.category.trim().toLowerCase()}`, name: form.category.trim() } : null,
          tags: form.tags.split(",").map((name) => name.trim()).filter(Boolean).map((name) => ({ id: `tag-${name.toLowerCase()}`, name })),
        };
        writeDemoTasks(editing ? existing.map((task) => task.id === editing ? next : task) : [...existing, next]);
        setMessage(editing ? "Task updated locally." : "Task created locally.");
      } else {
        const response = await fetch(editing ? `/api/tasks/${editing}` : "/api/tasks", {
          method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean), dueDate: form.dueDate || null, category: form.category || null }),
        });
        if (!response.ok) throw new Error(await readError(response, "Could not save task."));
        setMessage(editing ? "Task updated." : "Task created.");
      }
      setEditing(null); setForm(emptyForm); setEditorOpen(false); await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save task.");
    } finally { setSaving(false); }
  }
  async function updateTask(id: string, data: Partial<FormState>) {
    if (demoMode) {
      writeDemoTasks(readDemoTasks().map((task) => task.id === id ? {
        ...task, ...data, notes: data.notes ?? task.notes, dueDate: data.dueDate === undefined ? task.dueDate : data.dueDate || null,
        category: data.category === undefined ? task.category : data.category ? { id: `category-${data.category.toLowerCase()}`, name: data.category } : null,
        tags: data.tags === undefined ? task.tags : data.tags.split(",").map((name) => ({ id: `tag-${name.trim().toLowerCase()}`, name: name.trim() })).filter((tag) => tag.name),
      } : task));
      setMessage("Task updated locally.");
    } else {
      const response = await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!response.ok) { setError(await readError(response, "Could not update task.")); return; }
      setMessage("Task updated.");
    }
    await load();
  }
  async function removeTask(id: string) {
    if (!window.confirm("Delete this task permanently?")) return;
    if (demoMode) { writeDemoTasks(readDemoTasks().filter((task) => task.id !== id)); setMessage("Task deleted locally."); }
    else { const response = await fetch(`/api/tasks/${id}`, { method: "DELETE" }); if (!response.ok) { setError(await readError(response, "Could not delete task.")); return; } setMessage("Task deleted."); }
    await load();
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand"><span className="brand-mark">✓</span><span>momentum</span><button className="mobile-close" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}>×</button></div>
        <button className="quick-add" onClick={() => openEdit()}><Icon name="plus" /> <span>Quick add</span><kbd>⌘ K</kbd></button>
        <nav aria-label="Primary navigation">
          <NavItem icon="inbox" label="Overview" count={allCount} active={view === "overview"} onClick={() => setView("overview")} />
          <NavItem icon="today" label="Today" count={dueToday} active={view === "today"} onClick={() => setView("today")} />
          <NavItem icon="calendar" label="Upcoming" count={upcoming.length} active={view === "upcoming"} onClick={() => setView("upcoming")} />
          <NavItem icon="check" label="Completed" count={counts.completed ?? 0} active={view === "completed"} onClick={() => setView("completed")} />
          <NavItem icon="inbox" label="Inbox" active={view === "inbox"} onClick={() => setView("inbox")} />
        </nav>
        <div className="side-section"><div className="side-heading"><span>Organize</span><button aria-label="Add project" onClick={() => openEdit()}><Icon name="plus" /></button></div>
          <NavItem icon="folder" label="Projects" active={view === "projects"} onClick={() => setView("projects")} />
          {categories.slice(0, 3).map((item) => <button className="side-subitem" key={item.id} onClick={() => { setCategoryFilter(item.name.toLowerCase()); setView("overview"); }}>{item.name}<span>{allCount}</span></button>)}
          <NavItem icon="tag" label="Tags" active={view === "tags"} onClick={() => setView("tags")} />
        </div>
        <div className="sidebar-bottom"><div className="demo-note">{demoMode ? "Demo workspace · local only" : "Synced workspace"}</div><ThemeToggle /><Link className="settings-link" href="/settings">Settings</Link><LogoutButton /></div>
      </aside>
      {sidebarOpen && <button className="scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <main className="main-area">
        <header className="topbar"><button className="mobile-menu" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Icon name="menu" /></button><div className="breadcrumb">Workspace <span>/</span> {title}</div><div className="top-actions"><button className="icon-button" aria-label="Toggle theme"><Icon name="sun" /></button><div className="avatar">A</div></div></header>
        <div className="content">
          <div className="page-heading"><div><p className="eyebrow" suppressHydrationWarning>{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p><h1>{title}</h1><p className="subheading">{view === "overview" ? "A clear space for your best work." : `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"} in this view`}</p></div><button className="primary-button" onClick={() => openEdit()}><Icon name="plus" /> Add task</button></div>
          {demoMode && <div className="demo-banner">You’re exploring demo mode. Changes stay in this browser until you connect a database.</div>}
          {error && <div className="alert" role="alert">{error}</div>}
          {message && <div className="success" role="status">{message}</div>}
          {view === "overview" && <Overview allCount={allCount} activeCount={activeCount} dueToday={dueToday} completed={counts.completed ?? 0} upcoming={upcoming} onView={setView} />}
          {view === "projects" && <ProjectGrid categories={categories} tasks={tasks} onSelect={(name) => { setCategoryFilter(name.toLowerCase()); setView("overview"); }} />}
          {view === "tags" && <TagGrid tags={tags} tasks={tasks} onSelect={(name) => { setTagFilter(name.toLowerCase()); setView("overview"); }} />}
          {view !== "overview" && view !== "projects" && view !== "tags" && <TaskList tasks={tasks} loading={loading} error={error} search={search} setSearch={setSearch} sort={sort} direction={direction} setSort={setSort} setDirection={setDirection} onRetry={() => void load()} onToggle={(task) => void updateTask(task.id, { status: task.status === "completed" ? "todo" : "completed" })} onEdit={openEdit} onDelete={removeTask} />}
          {view === "overview" && <section className="task-section"><div className="section-header"><div><p className="eyebrow">Your queue</p><h2>Recent tasks</h2></div><button className="text-button" onClick={() => setView("today")}>View today →</button></div><TaskList tasks={tasks.slice(0, 4)} loading={loading} error={error} search={search} setSearch={setSearch} sort={sort} direction={direction} setSort={setSort} setDirection={setDirection} compact onRetry={() => void load()} onToggle={(task) => void updateTask(task.id, { status: task.status === "completed" ? "todo" : "completed" })} onEdit={openEdit} onDelete={removeTask} /></section>}
        </div>
      </main>
      {editorOpen ? <TaskEditor form={form} setForm={setForm} editing={editing} saving={saving} onSubmit={submit} onClose={() => { setEditing(null); setForm(emptyForm); setEditorOpen(false); }} /> : null}
    </div>
  );
}

function NavItem({ icon, label, count, active, onClick }: { icon: "inbox" | "today" | "calendar" | "check" | "folder" | "tag"; label: string; count?: number; active: boolean; onClick: () => void }) {
  return <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}><Icon name={icon} /><span>{label}</span>{count !== undefined && <b>{count}</b>}</button>;
}
function Overview({ allCount, activeCount, dueToday, completed, upcoming, onView }: { allCount: number; activeCount: number; dueToday: number; completed: number; upcoming: Task[]; onView: (view: View) => void }) {
  return <><div className="stat-grid"><Stat label="All tasks" value={allCount} tone="purple" /><Stat label="In progress" value={activeCount} tone="orange" /><Stat label="Due today" value={dueToday} tone="blue" /><Stat label="Completed" value={completed} tone="green" /></div><div className="overview-grid"><section className="focus-card"><div className="section-header"><div><p className="eyebrow">Stay focused</p><h2>Upcoming</h2></div><button className="text-button" onClick={() => onView("upcoming")}>See all →</button></div>{upcoming.slice(0, 3).map((task) => <TaskRow key={task.id} task={task} onToggle={() => {}} onEdit={() => {}} onDelete={() => {}} />)}{!upcoming.length && <p className="empty-state">You’re all caught up.</p>}</section><section className="progress-card"><p className="eyebrow">This week</p><h2>Great momentum</h2><div className="progress-ring"><strong>{Math.round((completed / Math.max(allCount, 1)) * 100)}%</strong><span>complete</span></div><p className="muted">Keep going — small steps add up.</p></section></div></>;
}
function Stat({ label, value, tone }: { label: string; value: number; tone: string }) { return <div className={`stat-card ${tone}`}><span className="stat-icon"><Icon name={tone === "green" ? "check" : tone === "blue" ? "today" : tone === "orange" ? "calendar" : "inbox"} /></span><div><p>{label}</p><strong>{value}</strong></div><span className="stat-trend">↗</span></div>; }
function TaskList({ tasks, loading, error, search, setSearch, sort, direction, setSort, setDirection, onRetry, compact, onToggle, onEdit, onDelete }: { tasks: Task[]; loading: boolean; error: string; search: string; setSearch: (value: string) => void; sort: SortField; direction: SortDirection; setSort: (value: SortField) => void; setDirection: (value: SortDirection) => void; onRetry: () => void; compact?: boolean; onToggle: (task: Task) => void; onEdit: (task: Task) => void; onDelete: (id: string) => void }) {
  return <div className={`task-list ${compact ? "compact" : ""}`}><div className="list-toolbar"><div className="search-box"><Icon name="search" /><input aria-label="Search tasks" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks..." /></div>{!compact && <><label className="sort-control">Sort<select aria-label="Sort tasks" value={sort} onChange={(event) => setSort(event.target.value as SortField)}><option value="updatedAt">Recently updated</option><option value="createdAt">Created date</option><option value="title">Title</option><option value="priority">Priority</option><option value="dueDate">Due date</option></select></label><button className="filter-button" onClick={() => setDirection(direction === "asc" ? "desc" : "asc")} aria-label="Toggle sort direction">{direction === "asc" ? "↑" : "↓"}</button><button className="filter-button" onClick={() => setSearch("")}>Clear</button></>}</div>{loading ? <p className="empty-state">Loading your tasks…</p> : error ? <div className="empty-state"><p>We couldn’t load your tasks.</p><button className="secondary-button" onClick={onRetry}>Try again</button></div> : tasks.length ? tasks.map((task) => <TaskRow key={task.id} task={task} onToggle={() => onToggle(task)} onEdit={() => onEdit(task)} onDelete={() => onDelete(task.id)} />) : <p className="empty-state">{search ? "No tasks match your search. Try clearing the search." : "No tasks here yet. Add one to get started."}</p>}</div>;
}
function TaskRow({ task, onToggle, onEdit, onDelete }: { task: Task; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  return <article className={`task-row ${task.status === "completed" ? "is-complete" : ""}`}><button className={`task-check ${task.status === "completed" ? "checked" : ""}`} aria-label={`Mark ${task.title} ${task.status === "completed" ? "active" : "complete"}`} onClick={onToggle}>{task.status === "completed" && <Icon name="check" />}</button><button className="task-main" onClick={onEdit}><strong>{task.title}</strong><span>{task.category?.name ?? "Inbox"} {task.dueDate && `· ${dateLabel(task.dueDate)}`}</span></button><div className="task-meta">{task.priority !== "none" && <span className={`priority ${task.priority}`}>{task.priority}</span>}{task.tags.slice(0, 2).map((tag) => <span className="tag-pill" key={tag.id}>{tag.name}</span>)}</div><button className="row-menu" aria-label={`More actions for ${task.title}`} onClick={onDelete}><Icon name="dots" /></button></article>;
}
function ProjectGrid({ categories, tasks, onSelect }: { categories: Option[]; tasks: Task[]; onSelect: (name: string) => void }) { return <div className="tile-grid">{categories.map((item) => <button className="project-tile" key={item.id} onClick={() => onSelect(item.name)}><span className="tile-icon"><Icon name="folder" /></span><strong>{item.name}</strong><span>{tasks.filter((task) => task.category?.id === item.id).length} tasks</span></button>)}</div>; }
function TagGrid({ tags, tasks, onSelect }: { tags: Option[]; tasks: Task[]; onSelect: (name: string) => void }) { return <div className="tile-grid">{tags.map((item) => <button className="project-tile tag-tile" key={item.id} onClick={() => onSelect(item.name)}><span className="tile-icon"><Icon name="tag" /></span><strong>#{item.name}</strong><span>{tasks.filter((task) => task.tags.some((tag) => tag.id === item.id)).length} tasks</span></button>)}</div>; }
function TaskEditor({ form, setForm, editing, saving, onSubmit, onClose }: { form: FormState; setForm: (form: FormState) => void; editing: string | null; saving: boolean; onSubmit: (event: FormEvent) => void; onClose: () => void }) {
  const update = (key: keyof FormState, value: string) => setForm({ ...form, [key]: value });
  return <div className="modal-backdrop" role="presentation"><form className="editor" onSubmit={onSubmit}><div className="editor-head"><div><p className="eyebrow">{editing ? "Edit task" : "New task"}</p><h2>{editing ? "Make it happen" : "What’s on your mind?"}</h2></div><button type="button" className="close-button" aria-label="Close editor" onClick={onClose}>×</button></div><label>Task title<input autoFocus value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="e.g. Prepare weekly review" required /></label><label>Notes<textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Add context, links, or next steps..." rows={4} /></label><div className="form-grid"><label>Due date<input type="date" value={form.dueDate} onChange={(event) => update("dueDate", event.target.value)} /></label><label>Priority<select value={form.priority} onChange={(event) => update("priority", event.target.value)}><option value="none">None</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label></div><div className="form-grid"><label>Project<input value={form.category} onChange={(event) => update("category", event.target.value)} placeholder="Work, Personal..." /></label><label>Tags<input value={form.tags} onChange={(event) => update("tags", event.target.value)} placeholder="focus, launch" /></label></div>{editing && <label>Status<select value={form.status} onChange={(event) => update("status", event.target.value)}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></label>}<div className="editor-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create task"}</button></div></form></div>;
}
