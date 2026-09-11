import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { io } from "socket.io-client";
import "./App.css";
import "./projects.css";

type Role = "Admin" | "Project Manager" | "Developer";
type Status = "To Do" | "In Progress" | "In Review" | "Done";
type SessionUser = { id: string; name: string; role: Role };
const displayRole = (role: "ADMIN" | "PM" | "DEVELOPER"): Role => role === "ADMIN" ? "Admin" : role === "PM" ? "Project Manager" : "Developer";

type Task = {
  id: number;
  title: string;
  project: string;
  assignee: string;
  status: Status;
  priority: string;
  due: string;
  focus?: boolean;
};
type Event = {
  name: string;
  initials: string;
  color: string;
  text: string;
  time: string;
  project: string;
};
type NotificationItem = { id: string; message: string; readAt: string | null; createdAt: string };
type ProjectSummary = {
  name: string;
  client: string;
  owner: string;
  total: number;
  done: number;
  status: string;
  color: string;
};
type TeamMember = { name: string; email: string; role: string; status: string; color: string };

const tasks: Task[] = [
  {
    id: 12,
    title: "Checkout performance audit",
    project: "Northstar Rebrand",
    assignee: "Ravi Patel",
    status: "In Review",
    priority: "Critical",
    due: "Today",
    focus: true,
  },
  {
    id: 18,
    title: "Mobile navigation states",
    project: "Cedar & Co. Commerce",
    assignee: "Maya Chen",
    status: "In Progress",
    priority: "High",
    due: "Tomorrow",
    focus: true,
  },
  {
    id: 21,
    title: "Analytics event mapping",
    project: "Northstar Rebrand",
    assignee: "Jordan Lee",
    status: "To Do",
    priority: "Medium",
    due: "Sep 18",
    focus: true,
  },
  {
    id: 24,
    title: "QA accessibility sweep",
    project: "Atlas Health Portal",
    assignee: "Ravi Patel",
    status: "Done",
    priority: "Low",
    due: "Sep 20",
  },
];
const activity: Event[] = [
  {
    name: "Ravi Patel",
    initials: "RP",
    color: "coral",
    text: "moved Task #12 from In Progress → In Review",
    time: "2 mins ago",
    project: "Northstar Rebrand",
  },
  {
    name: "Maya Chen",
    initials: "MC",
    color: "blue",
    text: "was assigned Task #18 · Mobile navigation states",
    time: "18 mins ago",
    project: "Cedar & Co. Commerce",
  },
  {
    name: "Sam Okafor",
    initials: "SO",
    color: "yellow",
    text: "created a new project · Atlas Health Portal",
    time: "43 mins ago",
    project: "Atlas Health Portal",
  },
  {
    name: "Jordan Lee",
    initials: "JL",
    color: "violet",
    text: "moved Task #21 from To Do → In Progress",
    time: "1 hr ago",
    project: "Northstar Rebrand",
  },
];
const projects: ProjectSummary[] = [
  {
    name: "Northstar Rebrand",
    client: "Northstar Labs",
    owner: "Sam Okafor",
    total: 24,
    done: 18,
    status: "On track",
    color: "yellow",
  },
  {
    name: "Cedar & Co. Commerce",
    client: "Cedar & Co.",
    owner: "Priya Shah",
    total: 19,
    done: 11,
    status: "In progress",
    color: "blue",
  },
  {
    name: "Atlas Health Portal",
    client: "Atlas Health",
    owner: "Sam Okafor",
    total: 21,
    done: 13,
    status: "Needs attention",
    color: "coral",
  },
];
function App() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [role, setRole] = useState<Role>("Admin");
  const [activeNav, setActiveNav] = useState("Overview");
  const [notifications, setNotifications] = useState(3);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationItems, setNotificationItems] = useState<NotificationItem[]>([
    { id: "demo-1", message: "Task #12 is ready for review.", readAt: null, createdAt: new Date().toISOString() },
    { id: "demo-2", message: "You were assigned Task #18: Mobile navigation states.", readAt: null, createdAt: new Date().toISOString() },
  ]);
  const [projectList, setProjectList] = useState(projects);
  const [taskList, setTaskList] = useState(tasks);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [invitedMembers, setInvitedMembers] = useState<TeamMember[]>([]);
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}/api/auth/refresh`, { method: "POST", credentials: "include" }).then(async (response) => { if (!response.ok) throw new Error(); return response.json(); }).then((session: { accessToken: string; user: { id: string; name: string; role: "ADMIN" | "PM" | "DEVELOPER" } }) => { const user = { ...session.user, role: displayRole(session.user.role) }; setAccessToken(session.accessToken); setSessionUser(user); setRole(user.role); }).catch(() => {}).finally(() => setAuthLoading(false));
  }, []);
  useEffect(() => {
    if (!accessToken) return;
    const socket = io(import.meta.env.VITE_API_URL ?? "http://localhost:4000", { auth: { token: accessToken }, withCredentials: true });
    socket.on("notification:count", (count: number) => setNotifications(count));
    socket.on("notification:new", (notification: NotificationItem) => { setNotificationItems((current) => [notification, ...current]); setNotifications((count) => count + 1); });
    return () => { socket.disconnect(); };
  }, [accessToken]);
  const apiFetch = async (path: string, options: RequestInit = {}) => fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}${path}`, { ...options, headers: { ...(options.headers ?? {}), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, credentials: "include" });
  const markNotificationRead = async (id: string) => { setNotificationItems((current) => current.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item)); setNotifications((count) => Math.max(0, count - 1)); if (accessToken && !id.startsWith("demo-")) await apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" }); };
  const markAllNotificationsRead = async () => { setNotificationItems((current) => current.map((item) => ({ ...item, readAt: new Date().toISOString() }))); setNotifications(0); if (accessToken) await apiFetch("/api/notifications/read-all", { method: "POST" }); };
  if (authLoading) return <div className="auth-loading">Loading secure workspace...</div>;
  if (!sessionUser || !accessToken) return <LoginPage onLogin={(session) => { setAccessToken(session.accessToken); setSessionUser(session.user); setRole(session.user.role); setAuthError(""); }} error={authError} setError={setAuthError} />;
  const [feed, setFeed] = useState(activity);
  const [taskFilter, setTaskFilter] = useState("All statuses");
  const [priorityFilter, setPriorityFilter] = useState("Any priority");
  const scopedTasks = useMemo(
    () =>
      role === "Developer"
        ? taskList.filter((task) => task.assignee === "Ravi Patel")
        : role === "Project Manager"
          ? taskList.filter(
              (task) =>
                task.project === "Northstar Rebrand" ||
                task.project === "Atlas Health Portal",
            )
          : taskList,
    [role, taskList],
  );
  const visibleTasks = useMemo(
    () =>
      scopedTasks.filter(
        (task) =>
          (taskFilter === "All statuses" || task.status === taskFilter) &&
                (priorityFilter === "Any priority" ||
                  (priorityFilter === "High or critical" ? task.priority === "High" || task.priority === "Critical" : task.priority === priorityFilter)),
      ),
    [priorityFilter, scopedTasks, taskFilter],
  );
  const visibleActivity =
    role === "Developer"
      ? feed.filter(
          (event) => event.name === "Ravi Patel" || event.text.includes("#12"),
        )
      : role === "Project Manager"
        ? feed.filter(
            (event) =>
              event.project === "Northstar Rebrand" ||
              event.project === "Atlas Health Portal",
          )
        : feed;
  const visibleProjects =
    role === "Developer"
      ? projectList.filter(
          (project) =>
            project.name === "Northstar Rebrand" ||
            project.name === "Atlas Health Portal",
        )
      : role === "Project Manager"
        ? projectList.filter((project) => project.owner === "Sam Okafor")
        : projectList;
  const statusFor = (projectName: string) =>
    projectList.find((project) => project.name === projectName)?.status ??
    "Unknown";
  const canCreateProject = role === "Admin" || role === "Project Manager";
  const createProject = (project: ProjectSummary) => {
    setProjectList((current) => [project, ...current]);
    setFeed((current) => [{ name: role === "Admin" ? "Alex Kim" : "Sam Okafor", initials: role === "Admin" ? "AK" : "SO", color: role === "Admin" ? "purple" : "yellow", text: `created a new project · ${project.name}`, time: "Just now", project: project.name }, ...current]);
    setShowProjectForm(false);
    setActiveNav("Projects");
  };
  const deleteProject = (projectName: string) => {
    setProjectList((current) =>
      current.filter((project) => project.name !== projectName),
    );
  };
  const updateProjectStatus = (projectName: string, status: string) => {
    const previousStatus = projectList.find((project) => project.name === projectName)?.status;
    setProjectList((current) =>
      current.map((project) =>
        project.name === projectName ? { ...project, status } : project,
      ),
    );
    if (previousStatus !== status) setFeed((current) => [{ name: role === "Admin" ? "Alex Kim" : "Sam Okafor", initials: role === "Admin" ? "AK" : "SO", color: role === "Admin" ? "purple" : "yellow", text: `changed ${projectName} from ${previousStatus} to ${status}`, time: "Just now", project: projectName }, ...current]);
  };
  const updateTaskStatus = (taskId: number, status: Status) => {
    const changedTask = taskList.find((task) => task.id === taskId);
    setTaskList((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status,
              priority: status === "Done" ? "Low" : task.priority,
              focus: status === "Done" ? false : task.focus,
            }
          : task,
      ),
    );
    if (changedTask && changedTask.status !== status) setFeed((current) => [{ name: role === "Developer" ? "Ravi Patel" : role === "Project Manager" ? "Sam Okafor" : "Alex Kim", initials: role === "Developer" ? "RP" : role === "Project Manager" ? "SO" : "AK", color: role === "Developer" ? "coral" : role === "Project Manager" ? "yellow" : "purple", text: `moved Task #${taskId} from ${changedTask.status} → ${status}`, time: "Just now", project: changedTask.project }, ...current]);
  };
  const toggleTaskFocus = (taskId: number) => {
    setTaskList((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, focus: task.status === "Done" ? false : !task.focus } : task,
      ),
    );
  };
  const createTask = (task: Task) => {
    setTaskList((current) => [task, ...current]);
    setFeed((current) => [{ name: role === "Developer" ? "Ravi Patel" : role === "Project Manager" ? "Sam Okafor" : "Alex Kim", initials: role === "Developer" ? "RP" : role === "Project Manager" ? "SO" : "AK", color: role === "Developer" ? "coral" : role === "Project Manager" ? "yellow" : "purple", text: `created Task #${task.id} · ${task.title}`, time: "Just now", project: task.project }, ...current]);
    setShowTaskForm(false);
    setActiveNav("My tasks");
  };
  const inviteMember = (member: TeamMember) => { setInvitedMembers((current) => [...current, member]); setShowInviteForm(false); };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">⌁</span>
          <span>
            atelier<span className="brand-dot">.</span>
          </span>
        </div>
        <div className="workspace-switcher">
          <span className="workspace-icon">A</span>
          <span>
            <b>Atelier Studio</b>
            <small>Operations workspace</small>
          </span>
          <span className="chevron">⌄</span>
        </div>
        <nav className="nav">
          <span className="nav-label">Workspace</span>
          <NavItem
            icon="◈"
            label="Overview"
            activeNav={activeNav}
            setActiveNav={setActiveNav}
          >
            <kbd>⌘ 1</kbd>
          </NavItem>
          <NavItem
            icon="□"
            label="Projects"
            activeNav={activeNav}
            setActiveNav={setActiveNav}
          >
            <em>8</em>
          </NavItem>
          <NavItem
            icon="✓"
            label="My tasks"
            activeNav={activeNav}
            setActiveNav={setActiveNav}
          >
            <em className="orange">4</em>
          </NavItem>
          <NavItem
            icon="◷"
            label="Activity"
            activeNav={activeNav}
            setActiveNav={setActiveNav}
          />
          <span className="nav-label second">Manage</span>
          <NavItem
            icon="♧"
            label="Team"
            activeNav={activeNav}
            setActiveNav={setActiveNav}
          />
          <NavItem
            icon="⚙"
            label="Settings"
            activeNav={activeNav}
            setActiveNav={setActiveNav}
          />
        </nav>
        <div className="sidebar-bottom">
          <div className="system-status">
            <span className="live-dot"></span> All systems operational
          </div>
          <div className="profile">
            <div className="avatar purple">AK</div>
            <span>
              <b>Alex Kim</b>
              <small>Administrator</small>
            </span>
            <span className="more">•••</span>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <b>/</b>
            <strong>Overview</strong>
          </div>
          <div className="top-actions">
            <div className="live-presence">
              <span className="live-dot"></span> 12 online
            </div>
            <button className="icon-btn" aria-label="Search">
              ⌕
            </button>
            <button
              className="notification-btn"
              aria-label="Notifications"
              aria-expanded={notificationOpen}
              onClick={() => setNotificationOpen((open) => !open)}
            >
              ♧{notifications > 0 && <i>{notifications}</i>}
            </button>
            {notificationOpen && <div className="notification-dropdown"><div className="notification-header"><b>Notifications</b><button type="button" onClick={markAllNotificationsRead}>Mark all read</button></div>{notificationItems.length === 0 ? <p className="notification-empty">No notifications yet.</p> : notificationItems.map((item) => <button type="button" className={`notification-item ${item.readAt ? "read" : ""}`} key={item.id} onClick={() => markNotificationRead(item.id)}><span className="notification-dot"></span><span><b>{item.message}</b><small>{item.readAt ? "Read" : "Unread"}</small></span></button>)}</div>}
            <button className="avatar purple small">AK</button>
          </div>
        </header>
        <div className="content-wrap">
          {activeNav === "Activity" ? (
            <ActivityPage events={visibleActivity} statusFor={statusFor} />
          ) : activeNav === "Projects" ? (
            <ProjectsPage
              projects={visibleProjects}
              tasks={scopedTasks}
              role={role}
              onCreate={() => setShowProjectForm(true)}
              onDelete={deleteProject}
              onStatusChange={updateProjectStatus}
            />
          ) : activeNav === "My tasks" ? (
            <TaskPage
              title="My tasks"
              subtitle="Tasks assigned to your role"
              tasks={visibleTasks}
              statusFor={statusFor}
              role={role}
              onStatusChange={updateTaskStatus}
              onCreate={() => setShowTaskForm(true)}
              onToggleFocus={toggleTaskFocus}
              initialPriority={priorityFilter === "High or critical" ? "High or critical" : "Any priority"}
            />
          ) : activeNav === "Team" ? (
            <TeamPage role={role} invitedMembers={invitedMembers} onInvite={() => setShowInviteForm(true)} />
          ) : activeNav === "Settings" ? (
            <SettingsPage role={role} />
          ) : (
            <>
              <section className="welcome">
                <div>
                  <p className="eyebrow">
                    THURSDAY, SEPTEMBER 11, 2026 <span className="sun">☼</span>
                  </p>
                  <h1>
                    {role === "Admin"
                      ? "Good morning, Alex"
                      : role === "Project Manager"
                        ? "Your studio, at a glance"
                        : "Your work, at a glance"}
                    <span className="period">.</span>
                  </h1>
                  <p className="subhead">
                    {role === "Admin"
                      ? "Here’s what’s moving across the entire studio today."
                      : role === "Project Manager"
                        ? "Here’s how your projects and team are moving today."
                        : "Here’s what needs your attention today."}
                  </p>
                </div>
                <div className="role-control">
                  <label>Viewing as</label>
                  <select
                    value={role}
                    disabled
                  >
                    <option>Admin</option>
                    <option>Project Manager</option>
                    <option>Developer</option>
                  </select>
                </div>
              </section>
              <RoleMetrics
                role={role}
                projects={visibleProjects}
                tasks={scopedTasks}
                onNavigate={setActiveNav}
              />
              <section className="dashboard-grid">
                <WorkOverview tasks={scopedTasks} />
                <div className="panel work-panel legacy-work-panel">
                  <PanelHeader
                    title={
                      role === "Developer"
                        ? "My workload"
                        : role === "Project Manager"
                          ? "Project workload"
                          : "Work overview"
                    }
                    subtitle={
                      role === "Developer"
                        ? "Your assigned task distribution"
                        : role === "Project Manager"
                          ? "Task distribution across your projects"
                          : "Task distribution across all projects"
                    }
                    action={<PeriodToggle />}
                  />
                  <div className="work-body">
                    <div className="donut-wrap">
                      <div className="donut">
                        <strong>
                          {role === "Developer"
                            ? "04"
                            : role === "Project Manager"
                              ? "41"
                              : "86"}
                        </strong>
                        <span>
                          {role === "Developer" ? "my tasks" : "total tasks"}
                        </span>
                      </div>
                    </div>
                    <div className="status-list">
                      <StatusLine
                        label="Done"
                        value={
                          role === "Developer"
                            ? "1"
                            : role === "Project Manager"
                              ? "20"
                              : "42"
                        }
                        percent="49%"
                        color="green"
                      />
                      <StatusLine
                        label="In progress"
                        value={
                          role === "Developer"
                            ? "2"
                            : role === "Project Manager"
                              ? "12"
                              : "24"
                        }
                        percent="28%"
                        color="blue"
                      />
                      <StatusLine
                        label="In review"
                        value={
                          role === "Developer"
                            ? "1"
                            : role === "Project Manager"
                              ? "5"
                              : "11"
                        }
                        percent="13%"
                        color="violet"
                      />
                      <StatusLine
                        label="To do"
                        value={
                          role === "Developer"
                            ? "0"
                            : role === "Project Manager"
                              ? "4"
                              : "9"
                        }
                        percent="10%"
                        color="gray"
                      />
                    </div>
                  </div>
                  <div className="sparkline">
                    <span>Mon</span>
                    <i></i>
                    <span>Tue</span>
                    <i></i>
                    <span>Wed</span>
                    <i></i>
                    <span>Thu</span>
                    <i></i>
                    <span>Fri</span>
                  </div>
                </div>
                <div className="panel focus-panel">
                  <PanelHeader
                    title={
                      role === "Developer"
                        ? "My priorities"
                        : role === "Project Manager"
                          ? "Project attention"
                          : "Focus this week"
                    }
                    subtitle={
                      role === "Developer"
                        ? "Tasks that need your attention"
                        : role === "Project Manager"
                          ? "Projects needing a closer look"
                          : "Priority items that need a look"
                    }
                    action={<span className="badge">3 items</span>}
                  />
                  <div className="focus-items">
                    {taskList.filter((task) => task.focus && (role !== "Developer" || task.assignee === "Ravi Patel") && (role !== "Project Manager" || task.project === "Northstar Rebrand" || task.project === "Atlas Health Portal")).map((task) => (
                      <FocusItem
                        key={task.id}
                        title={task.title}
                        meta={`${task.project} · #${task.id}`}
                        status={task.status}
                        tag={task.priority}
                        tagColor={task.priority === "Critical" ? "red" : task.priority === "High" ? "blue" : "gray"}
                        onComplete={() => updateTaskStatus(task.id, "Done")}
                      />
                    ))}
                  </div>
                  <button className="text-button" onClick={() => { setPriorityFilter("High or critical"); setActiveNav("My tasks"); }}>
                    View all priorities <span>→</span>
                  </button>
                </div>
              </section>
              <section className="lower-grid">
                <div className="panel projects-panel">
                  <PanelHeader
                    title={
                      role === "Developer"
                        ? "My tasks"
                        : role === "Project Manager"
                          ? "My projects"
                          : "Projects"
                    }
                    subtitle="Keep an eye on the latest work"
                    action={
                      canCreateProject ? (
                        <button
                          className="outline-button"
                          onClick={() => setShowProjectForm(true)}
                        >
                          + New project
                        </button>
                      ) : undefined
                    }
                  />
                  <div className="filters">
                    <select
                      value={taskFilter}
                      onChange={(event) => setTaskFilter(event.target.value)}
                    >
                      <option>All statuses</option>
                      <option>To Do</option>
                      <option>In Progress</option>
                      <option>In Review</option>
                      <option>Done</option>
                    </select>
                    <select
                      value={priorityFilter}
                      onChange={(event) =>
                        setPriorityFilter(event.target.value)
                      }
                    >
                      <option>Any priority</option>
                                          <option>High or critical</option>
                      <option>Critical</option>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                    <button
                      className="filter-button"
                      onClick={() => {
                        setTaskFilter("All statuses");
                        setPriorityFilter("Any priority");
                      }}
                    >
                      ≡ Clear
                    </button>
                  </div>
                  <div className="task-table">
                    <div className="table-head">
                      <span>Task</span>
                      <span>Project</span>
                      <span>Assignee</span>
                      <span>Status</span>
                      <span>Due</span>
                    </div>
                    {visibleTasks.map((task) => (
                      <div className="table-row" key={task.id}>
                        <span className="task-name">
                          <i
                            className={`priority ${task.priority.toLowerCase()}`}
                          ></i>
                          <b>{task.title}</b>
                          <small>
                            {task.project} · #{task.id} · {task.priority}
                          </small>
                        </span>
                        <span>
                          {task.project}
                          <small className="project-status-text">
                            {statusFor(task.project)}
                          </small>
                        </span>
                        <span>
                          <span className="mini-avatar">
                            {task.assignee
                              .split(" ")
                              .map((part) => part[0])
                              .join("")}
                          </span>
                          {task.assignee}
                        </span>
                        <span>
                          <TaskStatusControl
                            task={task}
                            role={role}
                            onChange={updateTaskStatus}
                          />
                        </span>
                        <span
                          className={task.due === "Today" ? "due-today" : ""}
                        >
                          {task.due}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button className="text-button table-footer" onClick={() => setActiveNav("My tasks")}>
                    Open task manager <span>→</span>
                  </button>
                </div>
                <div className="panel activity-panel">
                  <PanelHeader
                    title="Live activity"
                    subtitle={
                      <>
                        <span className="live-dot"></span>{" "}
                        {role === "Admin"
                          ? "All workspace updates"
                          : role === "Project Manager"
                            ? "Your project updates"
                            : "Your task updates"}
                      </>
                    }
                    action={
                      <ActivityMenu onOpen={() => setActiveNav("Activity")} />
                    }
                  />
                  <div className="activity-list">
                    {visibleActivity.map((event, index) => (
                      <div
                        className="activity-item"
                        key={`${event.name}-${index}`}
                      >
                        <div className={`avatar ${event.color}`}>
                          {event.initials}
                        </div>
                        <div>
                          <p>
                            <b>{event.name}</b> {event.text}
                          </p>
                          <small>
                            {event.time} <span>·</span> {event.project}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    className="text-button table-footer"
                    onClick={() => setActiveNav("Activity")}
                  >
                    View full activity <span>→</span>
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
      {showProjectForm && (
        <ProjectForm
          role={role}
          onCancel={() => setShowProjectForm(false)}
          onCreate={createProject}
        />
      )}
      {showTaskForm && (
        <TaskForm
          role={role}
          projects={visibleProjects}
          onCancel={() => setShowTaskForm(false)}
          onCreate={createTask}
        />
      )}
      {showInviteForm && <InviteForm accessToken={accessToken} onCancel={() => setShowInviteForm(false)} onInvite={inviteMember} />}
    </div>
  );
}
function WorkOverview({ tasks: scopedTasks }: { tasks: Task[] }) {
  const [period, setPeriod] = useState<"This week" | "This month">("This week");
  const periodTasks = period === "This month" ? scopedTasks : scopedTasks.filter((task) => ["Today", "Tomorrow", "Sep 18"].includes(task.due));
  const counts = {
    done: periodTasks.filter((task) => task.status === "Done").length,
    inProgress: periodTasks.filter((task) => task.status === "In Progress").length,
    inReview: periodTasks.filter((task) => task.status === "In Review").length,
    toDo: periodTasks.filter((task) => task.status === "To Do").length,
  };
  const total = periodTasks.length;
  const percent = (count: number) => total ? `${Math.round((count / total) * 100)}%` : "0%";
  const doneEnd = total ? (counts.done / total) * 100 : 0;
  const progressEnd = total ? doneEnd + (counts.inProgress / total) * 100 : 0;
  const reviewEnd = total ? progressEnd + (counts.inReview / total) * 100 : 0;
  return <div className="panel work-panel live-work-panel"><PanelHeader title="Work overview" subtitle={`Task distribution · ${period.toLowerCase()}`} action={<div className="period-select"><button type="button" className={period === "This week" ? "selected" : ""} onClick={() => setPeriod("This week")}>This week</button><button type="button" className={period === "This month" ? "selected" : ""} onClick={() => setPeriod("This month")}>This month</button></div>} /><div className="work-body"><div className="donut-wrap" style={{ background: `conic-gradient(#a8d348 0 ${doneEnd}%, #77bce6 ${doneEnd}% ${progressEnd}%, #af9be9 ${progressEnd}% ${reviewEnd}%, #d8d8d0 ${reviewEnd}% 100%)` }}><div className="donut"><strong>{total}</strong><span>total tasks</span></div></div><div className="status-list"><StatusLine label="Done" value={String(counts.done)} percent={percent(counts.done)} color="green" /><StatusLine label="In progress" value={String(counts.inProgress)} percent={percent(counts.inProgress)} color="blue" /><StatusLine label="In review" value={String(counts.inReview)} percent={percent(counts.inReview)} color="violet" /><StatusLine label="To do" value={String(counts.toDo)} percent={percent(counts.toDo)} color="gray" /></div></div><div className="sparkline"><span>{period === "This week" ? "Mon" : "Week 1"}</span><i></i><span>{period === "This week" ? "Tue" : "Week 2"}</span><i></i><span>{period === "This week" ? "Wed" : "Week 3"}</span><i></i><span>{period === "This week" ? "Thu" : "Week 4"}</span><i></i><span>{period === "This week" ? "Fri" : "Now"}</span></div></div>;
}
function PanelHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: ReactNode;
  action: ReactNode;
}) {
  return (
    <div className="panel-header">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
function PeriodToggle() {
  const [period, setPeriod] = useState<"This week" | "This month">("This week");
  return (
    <div className="period-select" aria-label="Workload period">
      <button
        type="button"
        className={period === "This week" ? "selected" : ""}
        onClick={() => setPeriod("This week")}
      >
        This week
      </button>
      <button
        type="button"
        className={period === "This month" ? "selected" : ""}
        onClick={() => setPeriod("This month")}
      >
        This month
      </button>
    </div>
  );
}
function ActivityMenu({ onOpen }: { onOpen: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="activity-menu">
      <button
        type="button"
        className="more-button"
        aria-label="Activity actions"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        •••
      </button>
      {open && (
        <div className="activity-menu-dropdown">
          <button
            type="button"
            onClick={() => {
              onOpen();
              setOpen(false);
            }}
          >
            Open full activity
          </button>
          <button type="button" onClick={() => setOpen(false)}>
            Refresh feed
          </button>
          <button type="button" onClick={() => setOpen(false)}>
            Dismiss menu
          </button>
        </div>
      )}
    </div>
  );
}
function ActivityPage({
  events,
  statusFor,
}: {
  events: Event[];
  statusFor: (projectName: string) => string;
}) {
  return (
    <>
      <section className="welcome">
        <div>
          <p className="eyebrow">WORKSPACE / ACTIVITY</p>
          <h1>
            Live activity<span className="period">.</span>
          </h1>
          <p className="subhead">
            A persisted timeline of changes across your workspace.
          </p>
        </div>
        <span className="badge">
          <span className="live-dot"></span> Live updates
        </span>
      </section>
      <section className="panel activity-page-panel">
        <PanelHeader
          title="Recent events"
          subtitle={`${events.length} events visible for your role`}
          action={<button className="outline-button">Newest first</button>}
        />
        <div className="activity-list">
          {events.map((event, index) => (
            <div className="activity-item" key={`${event.name}-${index}`}>
              <div className={`avatar ${event.color}`}>{event.initials}</div>
              <div>
                <p>
                  <b>{event.name}</b> {event.text}
                </p>
                <small>
                  {event.time} <span>·</span> {event.project} <span>·</span>{" "}
                  {statusFor(event.project)}
                </small>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
function ProjectsPage({
  projects: pageProjects,
  tasks: scopedTasks,
  role,
  onCreate,
  onDelete,
  onStatusChange,
}: {
  projects: ProjectSummary[];
  tasks: Task[];
  role: Role;
  onCreate: () => void;
  onDelete: (projectName: string) => void;
  onStatusChange: (projectName: string, status: string) => void;
}) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const handleDelete = (projectName: string) => {
    if (window.confirm(`Delete ${projectName}? This cannot be undone.`)) {
      onDelete(projectName);
      setOpenMenu(null);
    }
  };
  return (
    <>
      <section className="welcome">
        <div>
          <p className="eyebrow">WORKSPACE / PROJECTS</p>
          <h1>
            {role === "Developer" ? "Assigned projects" : "Projects"}
            <span className="period">.</span>
          </h1>
          <p className="subhead">
            {role === "Developer"
              ? "Projects containing your assigned work."
              : "A high-level view of every client engagement."}
          </p>
        </div>
        {role !== "Developer" && (
          <button className="outline-button" onClick={onCreate}>
            + New project
          </button>
        )}
      </section>
      <section className="project-cards">
        {pageProjects.map((project) => {
          const projectTasks = scopedTasks.filter(
            (task) => task.project === project.name,
          );
          const doneTasks = projectTasks.filter(
            (task) => task.status === "Done",
          ).length;
          const progress = projectTasks.length
            ? (doneTasks / projectTasks.length) * 100
            : 0;
          return (
            <article className="project-card" key={project.name}>
              <div className={`project-card-icon ${project.color}`}>
                {project.name.slice(0, 1)}
              </div>
              <div className="project-card-top">
                <select
                  className="project-status-select"
                  value={project.status}
                  disabled={role === "Developer"}
                  onChange={(event) =>
                    onStatusChange(project.name, event.target.value)
                  }
                  aria-label={`Status for ${project.name}`}
                >
                  <option>On track</option>
                  <option>In progress</option>
                  <option>Needs attention</option>
                  <option>Completed</option>
                  <option>New project</option>
                </select>
                {role !== "Developer" && (
                  <div className="project-menu">
                    <button
                      className="more-button"
                      onClick={() =>
                        setOpenMenu(
                          openMenu === project.name ? null : project.name,
                        )
                      }
                      aria-label={`Actions for ${project.name}`}
                    >
                      •••
                    </button>
                    {openMenu === project.name && (
                      <div className="project-menu-dropdown">
                        <button
                          type="button"
                          className="delete-project-button"
                          onClick={() => handleDelete(project.name)}
                        >
                          Delete project
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <h2>{project.name}</h2>
              <p>{project.client}</p>
              <div className="project-progress">
                <span style={{ width: `${progress}%` }}></span>
              </div>
              <div className="project-meta">
                <span>
                  {doneTasks} of {projectTasks.length} tasks done
                </span>
                <small>Owner · {project.owner}</small>
              </div>
              <button className="text-button">
                Open project <span>→</span>
              </button>
            </article>
          );
        })}
      </section>
    </>
  );
}
function TaskPage({
  title,
  subtitle,
  tasks: pageTasks,
  statusFor,
  role,
  onStatusChange,
  onCreate,
  onToggleFocus,
  initialPriority = "Any priority",
}: {
  title: string;
  subtitle: string;
  tasks: Task[];
  statusFor: (projectName: string) => string;
  role: Role;
  onStatusChange: (taskId: number, status: Status) => void;
  onCreate: () => void;
  onToggleFocus: (taskId: number) => void;
  initialPriority?: string;
}) {
  const [status, setStatus] = useState("All statuses");
  const [priority, setPriority] = useState(initialPriority);
  const filteredTasks = pageTasks.filter(
    (task) =>
      (status === "All statuses" || task.status === status) &&
          (priority === "Any priority" || (priority === "High or critical" ? task.priority === "High" || task.priority === "Critical" : task.priority === priority)),
  );
  const exportTasks = () => {
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const rows = [
      ["Task", "Project", "Assignee", "Status", "Priority", "Due date"],
      ...filteredTasks.map((task) => [task.title, task.project, task.assignee, task.status, task.priority, task.due]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, "-")}-tasks.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <section className="welcome">
        <div>
          <p className="eyebrow">WORKSPACE / TASKS</p>
          <h1>
            {title}
            <span className="period">.</span>
          </h1>
          <p className="subhead">{subtitle}</p>
        </div>
        <button className="outline-button" onClick={onCreate}>+ New task</button>
      </section>
      <section className="panel projects-panel">
        <PanelHeader
          title={`${filteredTasks.length} tasks`}
          subtitle="Filter, review, and track delivery"
          action={<button className="outline-button" onClick={exportTasks}>Export</button>}
        />
        <div className="filters">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option>All statuses</option>
            <option>To Do</option>
            <option>In Progress</option>
            <option>In Review</option>
            <option>Done</option>
          </select>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            <option>Any priority</option>
            <option>High or critical</option>
            <option>Critical</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
          <button
            className="filter-button"
            onClick={() => {
              setStatus("All statuses");
              setPriority("Any priority");
            }}
          >
            ≡ Clear
          </button>
        </div>
        <div className="task-table">
          <div className="table-head">
            <span>Task</span>
            <span>Project</span>
            <span>Assignee</span>
            <span>Status</span>
            <span>Due</span>
          </div>
          {filteredTasks.map((task) => (
            <div className="table-row" key={task.id}>
              <span className="task-name">
                <button type="button" className={`focus-toggle ${task.focus ? "is-focused" : ""}`} onClick={() => onToggleFocus(task.id)} aria-label={task.focus ? `Remove ${task.title} from focus` : `Add ${task.title} to focus`}>{task.focus ? "✓" : ""}</button>
                <i className={`priority ${task.priority.toLowerCase()}`}></i>
                <b>{task.title}</b>
                <small>
                  {task.project} · #{task.id} · {task.priority}
                </small>
              </span>
              <span>
                {task.project}
                <small className="project-status-text">
                  {statusFor(task.project)}
                </small>
              </span>
              <span>
                <span className="mini-avatar">
                  {task.assignee
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                </span>
                {task.assignee}
              </span>
              <span>
                <TaskStatusControl
                  task={task}
                  role={role}
                  onChange={onStatusChange}
                />
              </span>
              <span className={task.due === "Today" ? "due-today" : ""}>
                {task.due}
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
function TeamPage({ role, invitedMembers, onInvite }: { role: Role; invitedMembers: TeamMember[]; onInvite: () => void }) {
  const members: TeamMember[] = [
    ...invitedMembers,
    role === "Developer"
      ? [
          {
            name: "Ravi Patel",
            email: "dev1@atelier.test",
            role: "You · Developer",
            status: "Working on Task #12",
            color: "coral",
          },
        ]
      : [
          {
            name: "Alex Kim",
            email: "alex@atelier.test",
            role: "Administrator",
            status: "Online now",
            color: "purple",
          },
          {
            name: "Sam Okafor",
            email: "pm1@atelier.test",
            role: "Project Manager",
            status: "Reviewing Northstar",
            color: "yellow",
          },
          {
            name: "Maya Chen",
            email: "dev2@atelier.test",
            role: "Developer",
            status: "Working on Task #18",
            color: "blue",
          },
          {
            name: "Jordan Lee",
            email: "dev3@atelier.test",
            role: "Developer",
            status: "Online now",
            color: "violet",
          },
          ],
        ].flat();
  return (
    <>
      <section className="welcome">
        <div>
          <p className="eyebrow">MANAGE / TEAM</p>
          <h1>
            {role === "Developer" ? "My team" : "Team"}
            <span className="period">.</span>
          </h1>
          <p className="subhead">
            {role === "Developer"
              ? "Your current delivery context."
              : "People and presence across Atelier Studio."}
          </p>
        </div>
        {role !== "Developer" && <button className="outline-button" onClick={onInvite}>+ Invite member</button>}
      </section>
      <section className="team-grid">
        {members.map((member) => (
          <article className="team-card" key={member.name}>
            <div className={`avatar ${member.color}`}>
              {member.name
                .split(" ")
                .map((part) => part[0])
                .join("")}
            </div>
            <div>
              <h2>{member.name}</h2>
              <p>{member.role}</p>
              <small>
                <span className="live-dot"></span>
                {member.status}
              </small>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
function SettingsPage({ role }: { role: Role }) {
  const [saved, setSaved] = useState(false);
  return (
    <>
      <section className="welcome">
        <div>
          <p className="eyebrow">MANAGE / SETTINGS</p>
          <h1>
            Settings<span className="period">.</span>
          </h1>
          <p className="subhead">
            Configure your {role.toLowerCase()} workspace preferences.
          </p>
        </div>
      </section>
      <section className="settings-panel panel">
        <div className="settings-row">
          <div>
            <h2>Real-time notifications</h2>
            <p>Receive task and activity updates while you work.</p>
          </div>
          <input type="checkbox" defaultChecked />
        </div>
        <div className="settings-row">
          <div>
            <h2>Weekly digest</h2>
            <p>Get a summary of project progress every Monday.</p>
          </div>
          <input type="checkbox" defaultChecked />
        </div>
        <div className="settings-row">
          <div>
            <h2>Workspace role</h2>
            <p>Current permission level: {role}</p>
          </div>
          <span className="badge">{role}</span>
        </div>
        <button className="outline-button" onClick={() => setSaved(true)}>
          {saved ? "Saved" : "Save preferences"}
        </button>
      </section>
    </>
  );
}
function ProjectForm({
  role,
  onCancel,
  onCreate,
}: {
  role: Role;
  onCancel: () => void;
  onCreate: (project: ProjectSummary) => void;
}) {
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [error, setError] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !client.trim()) {
      setError("Project name and client are required.");
      return;
    }
    onCreate({
      name: name.trim(),
      client: client.trim(),
      owner: role === "Project Manager" ? "Sam Okafor" : "Alex Kim",
      total: 0,
      done: 0,
      status: "New project",
      color: "yellow",
    });
  };
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) =>
        event.target === event.currentTarget && onCancel()
      }
    >
      <form className="project-form" onSubmit={submit}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">NEW PROJECT</p>
            <h2>Create a project</h2>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <label>
          Project name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Northstar website"
            autoFocus
          />
        </label>
        <label>
          Client name
          <input
            value={client}
            onChange={(event) => setClient(event.target.value)}
            placeholder="e.g. Acme Inc."
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="cancel-button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="create-button">
            Create project
          </button>
        </div>
      </form>
    </div>
  );
}

function TaskForm({
  role,
  projects: availableProjects,
  onCancel,
  onCreate,
}: {
  role: Role;
  projects: ProjectSummary[];
  onCancel: () => void;
  onCreate: (task: Task) => void;
}) {
  const [title, setTitle] = useState("");
  const [project, setProject] = useState(availableProjects[0]?.name ?? "");
  const [assignee, setAssignee] = useState(role === "Developer" ? "Ravi Patel" : "Maya Chen");
  const [priority, setPriority] = useState("Medium");
  const [due, setDue] = useState("");
  const [addToFocus, setAddToFocus] = useState(false);
  const [error, setError] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !project || !due) {
      setError("Task title, project, and due date are required.");
      return;
    }
    onCreate({ id: Date.now(), title: title.trim(), project, assignee, status: "To Do", priority, due: new Date(`${due}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }), focus: addToFocus });
  };
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}><form className="project-form" onSubmit={submit}><div className="modal-header"><div><p className="eyebrow">NEW TASK</p><h2>Create a task</h2></div><button type="button" className="modal-close" onClick={onCancel} aria-label="Close">×</button></div><label>Task title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Prepare launch checklist" autoFocus /></label><label>Project<select value={project} onChange={(event) => setProject(event.target.value)}>{availableProjects.map((item) => <option key={item.name}>{item.name}</option>)}</select></label><label>Assignee<select value={assignee} onChange={(event) => setAssignee(event.target.value)}><option>Ravi Patel</option><option>Maya Chen</option><option>Jordan Lee</option><option>Noah Williams</option></select></label><label>Priority<select value={priority} onChange={(event) => setPriority(event.target.value)}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label><label>Due date<input type="date" value={due} onChange={(event) => setDue(event.target.value)} /></label><label className="checkbox-label"><input type="checkbox" checked={addToFocus} onChange={(event) => setAddToFocus(event.target.checked)} /> Add to Focus this week</label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="cancel-button" onClick={onCancel}>Cancel</button><button type="submit" className="create-button">Create task</button></div></form></div>;
}
function LoginPage({ onLogin, error, setError }: { onLogin: (session: { accessToken: string; user: SessionUser }) => void; error: string; setError: (message: string) => void }) {
  const [email, setEmail] = useState("alex@atelier.test");
  const [password, setPassword] = useState("atelier-demo");
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setLoading(true); setError(""); try { const response = await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ email, password }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error?.message ?? "Sign in failed."); onLogin({ accessToken: result.accessToken, user: { ...result.user, role: displayRole(result.user.role) } }); } catch (loginError) { setError(loginError instanceof Error ? loginError.message : "Sign in failed."); } finally { setLoading(false); } };
  return <main className="auth-page"><form className="project-form auth-form" onSubmit={submit}><div className="brand auth-brand"><span className="brand-mark">⌁</span><span>atelier<span className="brand-dot">.</span></span></div><p className="eyebrow">SECURE WORKSPACE</p><h1>Sign in</h1><p className="subhead">Use your Atelier account to continue.</p><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoFocus /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="form-error">{error}</p>}<button className="create-button auth-submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button></form></main>;
}
function InviteForm({ accessToken, onCancel, onInvite }: { accessToken: string | null; onCancel: () => void; onInvite: (member: TeamMember) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [memberRole, setMemberRole] = useState("Developer");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email)) { setError("Enter a name and a valid email address."); return; }
    setSending(true); setError("");
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 12000);
      const response = await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}/api/team/invite`, { method: "POST", headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, credentials: "include", body: JSON.stringify({ name: name.trim(), email: email.trim(), role: memberRole === "Developer" ? "DEVELOPER" : memberRole === "Project Manager" ? "PM" : "ADMIN" }), signal: controller.signal });
      window.clearTimeout(timeout);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "The invitation could not be sent.");
      onInvite({ name: name.trim(), email: email.trim(), role: memberRole, status: "Invitation sent", color: memberRole === "Developer" ? "blue" : memberRole === "Project Manager" ? "yellow" : "purple" });
    } catch (inviteError) { setError(inviteError instanceof DOMException && inviteError.name === "AbortError" ? "Email delivery timed out. Check SMTP_HOST, SMTP_PORT, and SMTP credentials in .env." : inviteError instanceof TypeError ? "The API is unreachable. Start the Express server with npm run dev:server, then try again." : inviteError instanceof Error ? inviteError.message : "The invitation could not be sent."); } finally { setSending(false); }
  };
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}><form className="project-form" onSubmit={submit}><div className="modal-header"><div><p className="eyebrow">TEAM / INVITE</p><h2>Invite a member</h2></div><button type="button" className="modal-close" onClick={onCancel} aria-label="Close">×</button></div><label>Full name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Taylor Morgan" autoFocus /></label><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="taylor@company.com" /></label><label>Role<select value={memberRole} onChange={(event) => setMemberRole(event.target.value)}><option>Developer</option><option>Project Manager</option><option>Admin</option></select></label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="cancel-button" onClick={onCancel}>Cancel</button><button type="submit" className="create-button" disabled={sending}>{sending ? "Sending..." : "Send invite"}</button></div></form></div>;
}
function NavItem({
  icon,
  label,
  activeNav,
  setActiveNav,
  children,
}: {
  icon: string;
  label: string;
  activeNav: string;
  setActiveNav: (label: string) => void;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`nav-item ${activeNav === label ? "active" : ""}`}
      onClick={() => setActiveNav(label)}
    >
      <span>{icon}</span> {label} {children}
    </button>
  );
}
function RoleMetrics({
  role,
  projects: visibleProjects,
  tasks: visibleTasks,
  onNavigate,
}: {
  role: Role;
  projects: ProjectSummary[];
  tasks: Task[];
  onNavigate: (tab: string) => void;
}) {
  const inProgress = visibleTasks.filter(
    (task) => task.status === "In Progress",
  ).length;
  const overdue = visibleTasks.filter(
    (task) => task.due === "Today" && task.status !== "Done",
  ).length;
  const inReview = visibleTasks.filter(
    (task) => task.status === "In Review",
  ).length;
  const critical = visibleTasks.filter(
    (task) => task.priority === "Critical" || task.priority === "High",
  ).length;
  const metrics =
    role === "Admin"
      ? [
          {
            label: "Active projects",
            value: String(visibleProjects.length).padStart(2, "0"),
            trend: "Open project portfolio",
            tone: "yellow",
            icon: "▣",
            tab: "Projects",
          },
          {
            label: "Tasks in progress",
            value: String(inProgress).padStart(2, "0"),
            trend: "Across all projects",
            tone: "blue",
            icon: "◒",
            tab: "My tasks",
          },
          {
            label: "Overdue tasks",
            value: String(overdue).padStart(2, "0"),
            trend: "Needs attention",
            tone: "coral",
            icon: "◷",
            tab: "My tasks",
          },
          {
            label: "Team online",
            value: "12",
            trend: "of 16 members",
            tone: "green",
            icon: "⊙",
            live: true,
            tab: "Team",
          },
        ]
      : role === "Project Manager"
        ? [
            {
              label: "My projects",
              value: String(visibleProjects.length).padStart(2, "0"),
              trend: "Owned projects",
              tone: "yellow",
              icon: "▣",
              tab: "Projects",
            },
            {
              label: "Team tasks",
              value: String(visibleTasks.length).padStart(2, "0"),
              trend: "In your projects",
              tone: "blue",
              icon: "◒",
              tab: "My tasks",
            },
            {
              label: "Needs attention",
              value: String(overdue + inReview).padStart(2, "0"),
              trend: "Overdue or in review",
              tone: "coral",
              icon: "◷",
              tab: "Activity",
            },
            {
              label: "Team online",
              value: "06",
              trend: "of 8 members",
              tone: "green",
              icon: "⊙",
              live: true,
              tab: "Team",
            },
          ]
        : [
            {
              label: "Assigned tasks",
              value: String(visibleTasks.length).padStart(2, "0"),
              trend: "Your assigned work",
              tone: "yellow",
              icon: "✓",
              tab: "My tasks",
            },
            {
              label: "In progress",
              value: String(inProgress).padStart(2, "0"),
              trend: "Keep moving",
              tone: "blue",
              icon: "◒",
              tab: "My tasks",
            },
            {
              label: "In review",
              value: String(inReview).padStart(2, "0"),
              trend: "Waiting for PM",
              tone: "coral",
              icon: "◷",
              tab: "Activity",
            },
            {
              label: "My priority",
              value: String(critical).padStart(2, "0"),
              trend: "High or critical",
              tone: "green",
              icon: "!",
              tab: "My tasks",
            },
          ];
  return (
    <section className="metric-grid">
      {metrics.map((metric) => (
        <button
          type="button"
          className="metric metric-button"
          key={metric.label}
          onClick={() => onNavigate(metric.tab)}
        >
          <div className={`metric-icon ${metric.tone}`}>{metric.icon}</div>
          <div>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small className={metric.live ? "live-copy" : ""}>
              {metric.live && <i className="live-dot"></i>}
              {metric.trend}
            </small>
          </div>
        </button>
      ))}
    </section>
  );
}
function StatusLine({
  label,
  value,
  percent,
  color,
}: {
  label: string;
  value: string;
  percent: string;
  color: string;
}) {
  return (
    <div className="status-line-row">
      <span>
        <i className={`dot ${color}`}></i>
        {label}
      </span>
      <b>{value}</b>
      <small>{percent}</small>
    </div>
  );
}
function FocusItem({
  title,
  meta,
  status,
  tag,
  tagColor,
  onComplete,
}: {
  title: string;
  meta: string;
  status?: Status;
  tag: string;
  tagColor: string;
  onComplete: () => void;
}) {
  return (
    <div className="focus-item">
      <button
        type="button"
        className="focus-check"
        aria-label={`Mark ${title} complete`}
        onClick={onComplete}
      >
        
      </button>
      <div>
        <b>{title}</b>
        <small>{meta}</small>
        {status && (
          <span
            className={`focus-status ${status.toLowerCase().replace(" ", "-")}`}
          >
            {status}
          </span>
        )}
      </div>
      <em className={tagColor}>{tag}</em>
    </div>
  );
}
function StatusPill({ status }: { status: Status }) {
  return (
    <span className={`status-pill ${status.toLowerCase().replace(" ", "-")}`}>
      {status}
    </span>
  );
}
function TaskStatusControl({
  task,
  role,
  onChange,
}: {
  task: Task;
  role: Role;
  onChange: (taskId: number, status: Status) => void;
}) {
  const canEdit =
    role === "Admin" ||
    role === "Project Manager" ||
    task.assignee === "Ravi Patel";
  return canEdit ? (
    <select
      className={`task-status-select ${task.status.toLowerCase().replace(" ", "-")}`}
      value={task.status}
      onChange={(event) => onChange(task.id, event.target.value as Status)}
      aria-label={`Status for ${task.title}`}
    >
      <option>To Do</option>
      <option>In Progress</option>
      <option>In Review</option>
      <option>Done</option>
    </select>
  ) : (
    <StatusPill status={task.status} />
  );
}
export default App;
