import type { AppDefinition } from "../kit/app.js";
import { qrApp } from "./qr/server.js";
import { calendarApp } from "./calendar/server.js";
import { timesheetApp } from "./timesheet/server.js";
import { loanApp } from "./loan/server.js";
import { citationsApp } from "./citations/server.js";

export const apps: AppDefinition[] = [qrApp, calendarApp, timesheetApp, loanApp, citationsApp];
