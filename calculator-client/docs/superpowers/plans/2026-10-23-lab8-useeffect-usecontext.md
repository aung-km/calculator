# Lab 8 useEffect and useContext Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the React calculator to the existing calculator API, keep server history synchronized, and add a light/dark theme through React context.

**Architecture:** A small API module owns the three server requests. `App` owns calculator, history, and theme state; it loads history in `useEffect`, refreshes it after calculation and clearing, and provides `ThemeContext`. `Button` consumes that context to choose theme-aware styles.

**Tech Stack:** React 19, Vite 8, Tailwind CSS 4, Node's built-in test runner

**Spec:** User-provided Lab 8 assignment screenshot (2026-10-23)

## Global Constraints

- Preserve the existing Lab 7 calculator interactions and responsive layout.
- Use the existing FastAPI contract: `POST /calculate` with `{ "expr": string }`, `GET /history?limit=50`, and `DELETE /history`.
- Create `ThemeContext` in a separate file, provide it from `App`, and consume it in `Button`.
- Do not add third-party dependencies.

## Review Focus

- API unavailable: calculator and history surfaces show useful errors without crashing.
- Invalid calculation: no history entry is added and the server error is displayed.
- Empty history: the panel has a clear empty state.
- Repeated clear: remains safe because the server endpoint is idempotent.
- Light theme: calculator buttons and surrounding surfaces remain readable.

---

### Task 1: Calculator API client

**Files:**
- Create: `src/api.js`
- Test: `src/api.test.js`
- Modify: `package.json`

**Interfaces:**
- Produces: `fetchHistory()`, `calculateExpression(expression)`, and `clearHistory()`.

- [ ] Write request-contract tests and verify they fail because the module is absent.
- [ ] Implement the API module with response validation and readable errors.
- [ ] Run the API tests and verify they pass.

### Task 2: Theme context and theme-aware button styles

**Files:**
- Create: `src/ThemeContext.jsx`
- Create: `src/buttonStyles.js`
- Test: `src/buttonStyles.test.js`
- Modify: `src/Button.jsx`

**Interfaces:**
- Consumes: theme value `"light" | "dark"` from `ThemeContext`.
- Produces: button visuals appropriate to the active theme.

- [ ] Write theme-style tests and verify they fail because the module is absent.
- [ ] Create the context and make `Button` consume it.
- [ ] Run the style tests and verify they pass.

### Task 3: App integration and responsive history UI

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: API helpers and `ThemeContext`.
- Produces: mount-time history fetch, post-equals refresh, post-clear refresh, and light/dark toggle.

- [ ] Wire server calculation and history synchronization into `App`.
- [ ] Add accessible theme, history, loading, empty, and error states.
- [ ] Run tests, lint, production build, and browser interaction checks.
