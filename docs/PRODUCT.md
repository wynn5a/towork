# Product

## Register

product

## Users

Individual knowledge workers — developers, PMs, and researchers — managing their
own projects, todos, and issues. They work **alongside an AI teammate** rather
than just delegating to it: the human drives through the GUI while an AI client
acts on the same local database through an embedded MCP server. They are
comfortable on the keyboard, value speed and density, and run this as a focused
desktop app (not a browser tab) on their own machine, local-first.

The job to be done: capture and move work quickly, and let an AI agent
participate as a peer — creating, updating, and completing the same items — with
every change visible and attributable.

## Product Purpose

Towork is a desktop task manager built on the premise that **AI is a first-class
teammate, not a chat feature**. The human and an AI client work the same
projects, todos, and issues against one local SQLite database — the human via the
GUI, the AI via an embedded MCP server. Mutations from either side are logged to
a shared activity timeline (actor: User or AI), and the app live-refreshes when
the AI acts.

Success looks like **seamless human+AI co-work**: the two parties operate on the
same data without friction, AI actions feel native and trustworthy (visible,
attributed, instantly reflected in the UI), and the human never has to context-
switch into a chatbot to collaborate. The interface earns trust by making the
AI's participation legible — what changed, who changed it, when.

## Brand Personality

**Calm, precise, trustworthy.** A quiet expert. The tool is composed and exact;
the AI teammate is dependable, never flashy. Voice is plain, technical, and
direct — it states facts (a field changed, an item completed) without
celebration or filler. The emotional goal is *confidence*: the user should feel
the system is accurate, fast, and honest about its state. Density and stillness,
not decoration, signal quality. Chrome recedes; the work is the loudest thing on
screen.

## Anti-references

- **Cluttered enterprise PM tools** (Jira/Asana lineage): heavy chrome, nested
  panels, toolbar overload, configuration sprawl. Towork stays dense but calm —
  never busy.
- **Generic SaaS dashboards**: hero-metric cards, gradient accents, identical
  card grids, tracked-uppercase eyebrows on every section. The AI-slop look is
  the enemy of trust here.
- **Chatbot-centric AI UIs**: AI bolted on as a chat sidebar or popup. Towork's
  AI acts directly on data as a teammate — there is no chat box, and the design
  must never imply one is the point.

## Design Principles

1. **AI is a teammate, not a feature.** The AI acts on the same data through the
   same surfaces as the human. Its work is visible, attributed, and reflected
   live — never quarantined into a chat panel. Design every surface so an AI
   actor is a natural participant, not a bolt-on.
2. **Show the state, don't hide it.** Every mutation — human or AI — is logged
   per-field and surfaced (activity timeline, live refresh). Legibility of *what
   changed and who did it* is what makes the collaboration trustworthy.
3. **Chrome recedes, data leads.** The interface is the quietest thing on the
   screen; todos, issues, and activity are the loudest. Hierarchy comes from
   elevation and a restrained color ramp, not from heavy borders, big type, or
   decoration.
4. **Keyboard-first, friction-last.** Every primary action is reachable without
   a mouse; ⌘K reaches everything; Simple Mode strips the surface to its essence.
   Speed is a feature, and the keyboard is the fast path.
5. **Calm confidence over flourish.** Trust is earned by precision and restraint.
   Motion confirms an action or reveals structure, then gets out of the way; if
   it doesn't help the user understand state, it doesn't ship.

## Accessibility & Inclusion

Target **WCAG 2.1 AA**. Body text meets ≥4.5:1 contrast against its surface
(≥3:1 for large text); the dark surface ramp and 4-step text ramp must be
verified against this, not assumed. Every action is keyboard-reachable, in
keeping with the keyboard-first identity. `prefers-reduced-motion: reduce` is
honored everywhere — animations degrade to near-instant crossfades or end-states,
and looping motion (shimmer, pulse, spinners) stops. Color is never the sole
carrier of meaning: status and data-type cues pair hue with a dot, label, or
icon so they remain distinguishable for color-blind users.
