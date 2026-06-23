# Agent Quick Reference

## By Category

### 🔍 Review & Analysis
- **accessibility-agent** — WCAG 2.1/2.2, a11y testing, inclusive UX
- **devils-advocate** — Stress-test ideas, find risks and edge cases
- **tech-debt** — Code debt analysis, remediation planning

### 💻 Development
- **react-remix-expert** — React 19.2, modern hooks, TypeScript, performance
- **debug-mode** — Bug hunting, root cause analysis, verification

### ⚙️ Operations
- **devops-expert** — CI/CD, automation, infrastructure, monitoring
- **thinking-beast** / **beast-mode** — Deep autonomous problem solving

---

## By Problem Type

| Problem | Agent | Why |
|---------|-------|-----|
| Component accessibility issues | accessibility-agent | Expert in WCAG, semantic HTML, ARIA, keyboard navigation |
| React refactoring / new features | react-remix-expert | Knows React 19.2, your stack (React Router v7), TypeScript |
| Test failures / bugs | debug-mode | Systematic debugging approach, root cause analysis |
| Architecture decisions | devils-advocate | Identifies risks before implementation |
| CI/CD / deployment / monitoring | devops-expert | DevOps infinity loop expertise |
| Code quality / test coverage / refactoring | tech-debt | Analyzes and plans remediation |
| Complex multi-step problems | thinking-beast | Autonomous, thorough, iterative solving |

---

## Invoke Pattern

```
@[agent-name] [your-request-with-context]
```

**Examples:**
```
@accessibility-agent review the AltitudeInfoIndicators component for a11y compliance

@react-remix-expert help me refactor JourneyPixiTimeline to use useEffectEvent for the motion logic

@debug-mode help me figure out why the scrollMultiplier tests are failing

@devils-advocate stress-test this new tag filtering architecture

@devops-expert set up GitHub Actions for our build and test pipeline

@tech-debt analyze the Pixi timeline renderer — it's 2500 lines

@thinking-beast implement the new altitude info gradient interpolation feature with thorough testing
```

---

## Full Docs

See [README.md](./README.md) for detailed descriptions of each agent.
