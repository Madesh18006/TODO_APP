export type DemoTask = {
  id: string;
  title: string;
  notes: string | null;
  status: "todo" | "in_progress" | "completed";
  priority: "none" | "low" | "medium" | "high";
  dueDate: string | null;
  category: { id: string; name: string } | null;
  tags: { id: string; name: string }[];
};

const day = (offset: number) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

const tag = (name: string) => ({ id: `tag-${name.toLowerCase()}`, name });
const category = (name: string) => ({
  id: `category-${name.toLowerCase()}`,
  name,
});

export function getDemoTasks(): DemoTask[] {
  return [
    {
      id: "demo-product-review",
      title: "Review product launch brief",
      notes: "Tighten the narrative and confirm the final launch milestones.",
      status: "in_progress",
      priority: "high",
      dueDate: day(0),
      category: category("Work"),
      tags: [tag("Focus"), tag("Launch")],
    },
    {
      id: "demo-grocery",
      title: "Pick up groceries for the weekend",
      notes: "Coffee, sourdough, seasonal fruit, and ingredients for Sunday dinner.",
      status: "todo",
      priority: "medium",
      dueDate: day(1),
      category: category("Personal"),
      tags: [tag("Errands")],
    },
    {
      id: "demo-design-sync",
      title: "Send design sync notes",
      notes: "Share decisions and owners with the product team.",
      status: "todo",
      priority: "low",
      dueDate: day(2),
      category: category("Work"),
      tags: [tag("Follow-up")],
    },
    {
      id: "demo-read",
      title: "Read through accessibility checklist",
      notes: "Capture anything we should address before the next release.",
      status: "todo",
      priority: "none",
      dueDate: day(4),
      category: category("Learning"),
      tags: [tag("Read"), tag("Product")],
    },
    {
      id: "demo-retro",
      title: "Book quarterly planning retro",
      notes: null,
      status: "completed",
      priority: "medium",
      dueDate: day(-2),
      category: category("Work"),
      tags: [tag("Planning")],
    },
    {
      id: "demo-walk",
      title: "Take an evening walk",
      notes: "A small reset before dinner.",
      status: "completed",
      priority: "none",
      dueDate: day(-1),
      category: category("Personal"),
      tags: [tag("Wellbeing")],
    },
  ];
}
