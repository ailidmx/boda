# Front-End Architecture

> Intended architecture for the invitation and dashboard React apps.
> This is the authoritative guidance for future work. See `docs/FRONTEND_AUDIT.md` for the
> current-state audit and `docs/adr/` for decisions.

## 1. Component hierarchy

Three tiers, in dependency order (UI primitives → shared → feature):

```
components/ui/        UI primitives — no business logic
components/shared/    Shared app components — compose primitives
features/<feature>/   Feature components — compose shared + primitives
```

- **UI primitives** (`Button`, `Input`, `Select`, `Dialog`, `Spinner`, `EmptyState`,
  `Badge`, `Card`, `Tooltip`, `Tabs`, `Table`): little or no business logic. They are the
  only place that knows about their own styling.
- **Shared app components** (`PageHeader`, `ConfirmDialog`, `DataTable`, `SearchInput`,
  `EntityAvatar`, `CurrencyDisplay`): reusable across features, compose primitives.
- **Feature components** (`UserForm`, `UserTable`, `RsvpCard`, `CabinCard`): live inside
  their feature folder and compose shared + primitives.

Do NOT put every component in a global `components/` folder. Feature components belong to
their feature.

## 2. Feature structure

Each domain is a folder under `features/`:

```
features/<feature>/
  components/
  hooks/
  services/
  schemas/
  types/
  utils/
  index.ts
```

- `components/` — presentational + feature-specific components.
- `hooks/` — feature hooks that coordinate server state, loading, errors, mutations.
- `services/` — domain logic / use-cases (no Firestore, no UI).
- `schemas/` — validation schemas.
- `types/` — domain types.
- `utils/` — pure helpers specific to the feature.
- `index.ts` — public API; prefer shallow imports (`import { useUsers } from "features/users"`).

Do NOT create folders mechanically — only create a folder when it holds real code.

## 3. Design system

- One design-token source per app (invitation: `styles/base.css` + `styles/tokens.css`;
  dashboard: `styles/_tokens.scss`). Prefer a shared token module for both apps where
  feasible.
- Use **semantic tokens** (`primary`, `secondary`, `success`, `warning`, `danger`, `muted`,
  `surface`, `background`, `foreground`) rather than arbitrary hex values scattered in JSX.
- Do NOT hardcode colors, spacing, radius, shadows, or breakpoints inside individual
  components. Reference tokens.
- Use the existing spacing scale and fluid type ramp. Avoid random values like `13px`,
  `17px`, `23px`.
- Define a small typography hierarchy (page title, section title, card title, body,
  secondary, label, caption) and reuse it.

## 4. State strategy

Classify state before choosing where it lives:

- **Local UI state** (dialog open, selected tab, input focus) → local `useState`.
- **URL state** (page, search, sort, filter) → URL/query params when shareable/reloadable.
- **Server state** (guests, cabins, tables, genres) → the app's data-fetching strategy
  (Firestore listeners behind repositories). Do NOT duplicate server data in global state.
- **Global client state** → only genuine cross-app concerns (theme, current user, language).

Do NOT solve every prop chain with Context. Prefer composition first; use Context only for
genuinely shared subtree/global concerns.

## 5. Form architecture

Separate UI rendering, form state, validation, and persistence:

```
Form component → form hook/state → validation schema → service/use-case → repository
```

- Forms have consistent labels, help text, error messages, required indicators, disabled
  states, submitting states, and success feedback.
- Do NOT perform Firestore writes directly inside individual field components.
- Reuse the existing validation in `web/shared/validation.js`; do not introduce competing
  validation patterns.

## 6. Data-flow architecture

```
UI → hooks/use-cases → services → repositories → Firestore
```

- **React components must NOT import Firestore SDK functions directly** (`getDocs`,
  `getDoc`, `setDoc`, `addDoc`, `updateDoc`, `deleteDoc`, `collection`, `doc`, `query`,
  `onSnapshot`). Route through repositories/services/hooks.
- **Repositories** own all Firestore access (paths, queries, CRUD, doc conversion, errors).
  No UI, no business rules.
- **Services** own domain logic. No Firestore.
- **Hooks/use-cases** orchestrate: call services, hold UI state, manage subscriptions.

## 7. Styling conventions

- Invitation: plain CSS co-located in `styles/`, mobile-first with `min-width` media
  queries, class names prefixed by section (e.g. `hero-eyebrow`, `rsvp-section`).
- Dashboard: SCSS partials in `styles/`, small border radii + generous padding ("sharp &
  airy").
- Keep DOM nesting shallow — one container level per section.
- Reuse existing shared components (carousels, modals) instead of reinventing.

## 8. Accessibility expectations

- Prefer native HTML semantics before ARIA. Use `<button>` for actions, not clickable
  `<div>`s.
- Associate labels with inputs.
- Provide accessible labels for icon-only controls (emoji icons, icon buttons).
- Manage focus in dialogs (focus trap, ESC to close, focus restore).
- Use semantic table headers and form error relationships.
- Ensure visible focus indicators and adequate contrast.

## 9. Responsive strategy

- Audit important pages at mobile, tablet, and desktop.
- Invitation: mobile-first, `min-width` breakpoints from `tokens.css`.
- Dashboard: `_responsive.scss` breakpoints; tables may scroll or switch representation on
  mobile. Do not blindly stack everything.

## 10. Reusable component policy

- **Search first** before creating any component. Ask: does this already exist? Can an
  existing component accept one more variant? Is this a UI primitive or a feature component?
- Do NOT create `Button2`, `CustomButton`, `NewModal`, `GenericCard2`, `BetterTable`.
- Do NOT over-abstract. Prefer three clear components over one configurable component with
  37 props. Reusability is valuable only when real reuse exists.

## 11. Loading / error / empty states

Every asynchronous feature must explicitly consider **loading, success, empty, error**.
Do not leave blank screens. Use shared primitives (`Spinner`, `Skeleton`, `EmptyState`,
`ErrorState`) rather than ad-hoc markup. Errors should be understandable to users; log
technical details separately.

## 12. Destructive actions

Delete/archive/reset actions must be visually and behaviorally clear: destructive styling,
confirmation, disabled/loading state, clear consequences. Prefer the app's dialog system
over `confirm()`.

## 13. Icons

Use one primary icon system. Do not mix multiple icon libraries. Do not use text glyphs
(✏ ❌ 🗑 📷) as interface icons unless deliberately part of the product style. Icon-only
controls need accessible labels/tooltips.

## 14. Notifications

Use one notification/toast strategy. Define when to use toast vs inline validation vs
page-level error vs confirmation dialog. Do not mix `alert()`, multiple toast libraries,
and custom banners.

## 15. Performance

Do not prematurely add memoization. Detect real structural problems first: unnecessary
fetches, duplicate subscriptions, expensive rendering, giant lists, unstable keys,
recreated heavy calculations, duplicate requests, excessive real-time listeners, large
imports. Use `React.memo`/`useMemo`/`useCallback` only when they solve a real problem.

## 16. Testing

- **Component tests** for important reusable primitives.
- **Feature tests** for forms, validation, filters, CRUD behavior.
- **E2E** for critical flows (login, navigation, create/edit/delete, search/filter).
- Test behavior, not implementation. Prefer accessible selectors (role, label, text).

## 17. Definition of done

A front-end task is NOT complete just because it visually works. For meaningful changes,
verify: correct architecture, reusable components used, loading/error/empty states,
responsive behavior, accessibility, keyboard behavior, no console errors, lint, typecheck,
tests, build, and browser verification when available.
