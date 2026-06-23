# Claude Code Custom Agents

This directory contains project-specific agent personas configured for Claude Code. Each agent has specialized expertise and can be invoked by name.

## Available Agents

### 1. **accessibility-agent** — Accessibility Expert
**Expertise**: WCAG 2.1/2.2, inclusive UX, a11y testing

**Use when**:
- Reviewing components for keyboard accessibility
- Ensuring semantic HTML and ARIA correctness
- Testing with screen readers (NVDA, JAWS, VoiceOver)
- Hardening forms and dynamic updates for accessibility

**Invoke**: `@accessibility-agent review this modal for keyboard traps and focus management`

---

### 2. **react-remix-expert** — Expert React Frontend Engineer
**Expertise**: React 19.2, modern hooks, Server Components, Actions, TypeScript, performance

**Use when**:
- Building new React components or features
- Refactoring React code with modern patterns
- Performance optimization questions
- React Router v7 integration help (matches your stack!)
- TypeScript type safety improvements

**Invoke**: `@react-remix-expert help me refactor this component to use useOptimistic`

---

### 3. **debug-mode** — Debug Mode Instructions
**Expertise**: Systematic bug hunting, root cause analysis, verification

**Use when**:
- You've hit a bug and need systematic debugging
- Error messages or test failures are unclear
- Need to trace code execution paths
- Want to ensure fixes don't introduce regressions

**Invoke**: `@debug-mode help me fix this test failure` or `I'm in debug mode` at the start of a session

---

### 4. **devils-advocate** — Devils Advocate
**Expertise**: Stress-testing ideas, finding flaws, identifying risks and edge cases

**Use when**:
- You want your architecture/design stress-tested before implementation
- Need to identify risks in a proposal
- Want counterarguments to strengthen a decision
- Seeking to find hidden assumptions

**Invoke**: `@devils-advocate stress-test this caching strategy` — end with "end game" to conclude

---

### 5. **devops-expert** — DevOps Expert
**Expertise**: CI/CD, automation, infrastructure as code, monitoring (infinity loop: Plan → Code → Build → Test → Release → Deploy → Operate → Monitor)

**Use when**:
- Setting up or improving CI/CD pipelines
- Infrastructure as Code questions
- Deployment strategy planning
- Monitoring and observability design
- Build and release automation

**Invoke**: `@devops-expert help me set up a GitHub Actions workflow for this repo`

---

### 6. **tech-debt** — Technical Debt Remediation Plan
**Expertise**: Code debt analysis, test coverage, documentation gaps, refactoring plans

**Use when**:
- Analyzing technical debt in the codebase
- Planning remediation for unmaintainable code
- Assessing test coverage gaps
- Creating actionable cleanup plans

**Invoke**: `@tech-debt analyze the technical debt in app/features/timeline/pixi/JourneyPixiTimeline.tsx`

---

### 7. **thinking-beast** / **beast-mode** — Autonomous Problem Solver
**Expertise**: Deep problem solving, extensive research, iterative implementation, thorough testing

**Use when**:
- Complex problems that require extensive research
- Multi-step implementations with verification
- Problems that need thorough edge case testing
- Tasks that benefit from autonomous, iterative solving

**Invoke**: `@thinking-beast solve this complex issue with deep research and thorough testing`

---

## How to Invoke Agents

### Method 1: Direct Invocation (Recommended)
```
@accessibility-agent review this component for WCAG compliance
```

Simply mention the agent name with `@` prefix in your message, describe your request, and Claude Code will load the agent persona and help you.

### Method 2: Explicit Request
```
I need help with accessibility. Can you use the accessibility-agent persona?
```

### Method 3: Session Start
```
I'm going to debug a complex issue — put me in debug-mode for this session
```

---

## Agent Metadata

All agents are configured in `.claude/agents.json` with:
- **ID**: Unique identifier
- **Name**: Display name
- **Description**: One-line summary
- **Category**: Purpose category (review, development, troubleshooting, etc.)
- **Prompt**: Full expert persona and guidelines

---

## Tips for Best Results

1. **Be specific**: The more context you provide, the better the agent can help
   - ❌ `@react-remix-expert help me with my component`
   - ✅ `@react-remix-expert help me refactor this useEffect hook to use the new useEffectEvent()`

2. **Stack personas when needed**: You can invoke multiple agents in sequence
   ```
   @react-remix-expert build this component with modern React 19.2 patterns
   → then @accessibility-agent review it for WCAG compliance
   ```

3. **Use devils-advocate before big decisions**: Stress-test architecture before implementation

4. **Reference context**: Point agents to specific files, lines, or recent commits
   ```
   @debug-mode check this failing test: app/features/timeline/domain/scrollMultiplier.jest.test.ts
   ```

---

## Configuration

- **Engine**: `.claude/agents.json` — centralized agent registry
- **Settings**: `.claude/settings.json` — includes agent references + PixiJS skill + Mantine MCP
- **Skills**: PixiJS official skill (`github:pixijs/pixijs-skills`) auto-loaded
- **MCP**: Mantine component library MCP auto-loaded

---

## Next Steps

1. Start invoking agents by name in your Claude Code sessions
2. Combine with the Mantine MCP and PixiJS skill for full-stack help
3. See [CLAUDE.md](../CLAUDE.md) for general architecture and conventions

Enjoy your custom agents! 🚀
