import "./styles/main.scss";
import { startDashboard } from "./dashboard.js";

const container = document.querySelector("#app");

// The dashboard is a standalone build served under /dashboard/*.
// Every route under /dashboard (including /dashboard/invitados, /dashboard/grupos,
// etc.) boots the dashboard. This fixes the previous bug where reloading a
// sub-route like /dashboard/invitados rendered the invitation instead of the
// dashboard.
startDashboard(container);
