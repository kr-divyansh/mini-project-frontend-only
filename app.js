const pageTitles = {
  overview: "Overview",
  projects: "Projects",
  districts: "Districts",
  analytics: "Analytics",
  alerts: "AI insights",
  settings: "Settings",
};

const sidebar = document.querySelector("#sidebar");
const overlay = document.querySelector("#sidebar-overlay");
const today = document.querySelector("[data-today]");
const toast = document.querySelector("#toast");
let toastTimer;

if (today) {
  today.textContent = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());
}

function announce(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function closeMobileMenu() {
  sidebar?.classList.remove("open");
  overlay?.classList.remove("visible");
}

function readRoute() {
  const [page = "overview", query = ""] = window.location.hash.slice(1).split("?");
  return { page: pageTitles[page] ? page : "overview", parameters: new URLSearchParams(query) };
}

function renderRoute() {
  const { page, parameters } = readRoute();
  window.scrollTo(0, 0);
  document.querySelectorAll("[data-view]").forEach((view) => {
    view.hidden = view.dataset.view !== page;
  });

  document.querySelectorAll("[data-page-link].nav-item").forEach((link) => {
    const active = link.dataset.pageLink === page;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  document.querySelector("#page-title").textContent = pageTitles[page];
  document.title = `${pageTitles[page]} · MPLAD Vision`;
  document.body.dataset.page = page;
  closeMobileMenu();

  if (page === "projects") {
    const searchInput = document.querySelector("#project-search");
    const statusFilter = document.querySelector("#status-filter");
    const district = parameters.get("district");
    const status = parameters.get("status");

    if (searchInput) searchInput.value = district || "";
    if (statusFilter) {
      statusFilter.value = statusFilter.querySelector(`option[value="${CSS.escape(status || "all")}"]`)
        ? (status || "all")
        : "all";
    }
    filterProjects();
  }

  if (page === "settings" && parameters.has("section")) {
    document.querySelector(`#${CSS.escape(parameters.get("section"))}`)?.scrollIntoView({ block: "start" });
  }
}

function navigate(page, parameters = new URLSearchParams()) {
  const query = parameters.toString();
  const nextHash = `#${page}${query ? `?${query}` : ""}`;
  if (window.location.hash === nextHash) renderRoute();
  else window.location.hash = nextHash;
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("a");
  if (!link) return;

  if (link.matches("[data-page-link]")) {
    event.preventDefault();
    const parameters = new URLSearchParams();
    if (link.dataset.district) parameters.set("district", link.dataset.district);
    if (link.dataset.status) parameters.set("status", link.dataset.status);
    if (link.dataset.pageHash) parameters.set("section", link.dataset.pageHash);
    navigate(link.dataset.pageLink, parameters);
    return;
  }

  const settingLink = link.closest(".settings-nav") && link.hash;
  if (settingLink) {
    event.preventDefault();
    navigate("settings", new URLSearchParams({ section: link.hash.slice(1) }));
  }
});

window.addEventListener("hashchange", renderRoute);

document.querySelector("#menu-toggle")?.addEventListener("click", () => {
  sidebar.classList.toggle("open");
  overlay?.classList.toggle("visible");
});

overlay?.addEventListener("click", closeMobileMenu);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMobileMenu();
    const modal = document.querySelector("#modal");
    if (modal) modal.hidden = true;
  }

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    const search = document.querySelector("#project-search");
    if (search && !document.querySelector('[data-view="projects"]').hidden) {
      event.preventDefault();
      search.focus();
    }
  }
});

const searchInput = document.querySelector("#project-search");
const statusFilter = document.querySelector("#status-filter");
const projectRows = [...document.querySelectorAll("#projects-table tr")];
const projectCount = document.querySelector("#project-count");
const emptyState = document.querySelector("#empty-state");

function filterProjects() {
  if (!searchInput || !statusFilter) return;

  const query = searchInput.value.trim().toLocaleLowerCase();
  const selectedStatus = statusFilter.value;
  let visible = 0;

  projectRows.forEach((row) => {
    const matchesQuery = row.dataset.name.toLocaleLowerCase().includes(query)
      || row.dataset.district.toLocaleLowerCase().includes(query);
    const matchesStatus = selectedStatus === "all" || row.dataset.status === selectedStatus;
    const isVisible = matchesQuery && matchesStatus;
    row.hidden = !isVisible;
    if (isVisible) visible += 1;
  });

  if (emptyState) emptyState.hidden = visible !== 0;
  if (projectCount) {
    projectCount.textContent = query || selectedStatus !== "all"
      ? `Showing ${visible} matching sample projects`
      : `Showing ${visible} of 248 projects · sample register`;
  }
}

searchInput?.addEventListener("input", filterProjects);
statusFilter?.addEventListener("change", filterProjects);

const modal = document.querySelector("#modal");

function showProjectDetails(row) {
  document.querySelector("#modal-title").textContent = row.dataset.name;
  document.querySelector("#modal-meta").textContent = `${row.dataset.district} · ${row.dataset.status}`;
  document.querySelector("#modal-progress").textContent = row.dataset.progress;
  document.querySelector("#modal-progress-bar").style.width = row.dataset.progress;
  document.querySelector("#modal-budget").textContent = row.dataset.budget;
  document.querySelector("#modal-updated").textContent = row.dataset.updated;
  modal.hidden = false;
  document.querySelector("#modal-close").focus();
}

if (modal) {
  document.querySelectorAll(".details-button").forEach((button) => {
    button.addEventListener("click", () => showProjectDetails(button.closest("tr")));
  });
  document.querySelector("#modal-close").addEventListener("click", () => {
    modal.hidden = true;
  });
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.hidden = true;
  });
}

document.querySelector("#export-button")?.addEventListener("click", () => {
  const headers = ["Project", "District", "Allocated", "Progress", "Status", "Last updated"];
  const values = projectRows.map((row) => [
    row.dataset.name,
    row.dataset.district,
    row.dataset.budget,
    row.dataset.progress,
    row.dataset.status,
    row.dataset.updated,
  ]);
  const csv = [headers, ...values]
    .map((line) => line.map((value) => `"${value.replaceAll('"', '""')}"`).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "mplad-vision-projects.csv";
  anchor.click();
  URL.revokeObjectURL(url);
  announce("Sample project register exported as CSV.");
});

document.querySelectorAll(".toggle").forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const enabled = toggle.getAttribute("aria-pressed") !== "true";
    toggle.setAttribute("aria-pressed", String(enabled));
    toggle.classList.toggle("is-on", enabled);
    announce(`${toggle.getAttribute("aria-label")} ${enabled ? "enabled" : "disabled"}.`);
  });
});

document.querySelectorAll(".settings-save").forEach((button) => {
  button.addEventListener("click", () => announce("Profile changes saved for this session."));
});

document.querySelector("#photo-button")?.addEventListener("click", () => {
  announce("Profile photo upload is not available in this demo.");
});

renderRoute();
