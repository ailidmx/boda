# Responsive Architecture

This directory contains the styling system for the invitation. The responsive
architecture is designed to be **maintainable, scalable, and mobile-first**.

## Principles

1. **Mobile-first** — Base styles target the smallest screen. Progressive
   enhancement happens with `min-width` media queries.
2. **Co-located media queries** — Each component's responsive rules live in
   that component's own CSS file, right next to its base styles. No more
   hunting through a monolithic `responsive.css` to find a rule.
3. **Token-driven** — All breakpoints, spacing, and type sizes come from
   `tokens.css`. Never hardcode a magic number.
4. **Fluid by default** — Use `clamp()` for type and spacing so the layout
   scales smoothly between breakpoints instead of jumping.

## File structure

```
styles/
├── tokens.css          # Design tokens: breakpoints, spacing, fluid type
├── base.css            # Reset, global layout, shared primitives (.section, .button, forms)
├── responsive.css      # Cross-cutting responsive rules (shared layout only)
├── <component>.css     # Each component's base styles + its own media queries
└── README.md           # This file
```

## Breakpoints

| Token   | Value  | Target                          |
| ------- | ------ | ------------------------------- |
| `--bp-sm` | 480px  | Small phones                    |
| `--bp-md` | 640px  | Large phones / small tablets    |
| `--bp-lg` | 900px  | Tablets / small laptops         |
| `--bp-xl` | 1200px | Laptops / desktops              |
| `--bp-2xl`| 1440px | Large desktops                  |

> **Note:** CSS custom properties cannot be used inside `@media` queries.
> The numeric values in `tokens.css` are the canonical source. Keep the
> `@media` rules in each file in sync with these values.

## Writing responsive rules

### Mobile-first pattern

```css
/* styles/hero.css */
.hero {
  /* Base styles: mobile */
  padding: var(--space-5);
}

/* Progressive enhancement: tablet+ */
@media (min-width: 640px) {
  .hero {
    padding: var(--space-7);
  }
}

/* Desktop */
@media (min-width: 900px) {
  .hero {
    padding: var(--space-9);
  }
}
```

### Fluid type

Prefer `clamp()` over media queries for type. Use the tokens:

```css
.hero h1 {
  font-size: var(--text-6xl); /* clamp(5rem, 3rem + 10vw, 9rem) */
}
```

### When to use media queries vs. fluid values

- **Use `clamp()`** for type sizes, spacing, and anything that should scale
  continuously with the viewport.
- **Use media queries** for layout changes (grid columns, flex direction,
  show/hide elements, stacking order) that need discrete breakpoints.

## Migration status

The invitation is being migrated from a **desktop-first** architecture (single
monolithic `responsive.css` with `max-width` overrides) to this **mobile-first**
co-located architecture.

| Component | Status |
| --------- | ------ |
| tokens.css | ✅ Done |
| base.css | 🔄 In progress |
| responsive.css | 🔄 In progress |
| nav.css | ⬜ Pending |
| hero.css | ⬜ Pending |
| ... | ⬜ Pending |

## Checklist for migrating a component

1. Read the component's base CSS file.
2. Identify any rules in `responsive.css` that target that component's classes.
3. Move those rules into the component's CSS file, rewritten as `min-width`
   media queries (mobile-first).
4. Replace hardcoded values with tokens from `tokens.css` where applicable.
5. Remove the migrated rules from `responsive.css`.
6. Verify the component at all breakpoints (480, 640, 900, 1200, 1440).
