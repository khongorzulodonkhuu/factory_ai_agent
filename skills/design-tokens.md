# Skill: design tokens (UI/UX designer agent)
- Produce tokens for a clean, modern, responsive web app that fits the product.
- Colors must include: primary, primary-dark, accent, surface, background, text, text-muted, success, warning, danger, border. Hex values with WCAG AA contrast for text on background/surface. success must be a green and warning an orange, each readable as text on white (4.5:1).
- Tokens become a Tailwind v4 theme: colors are used as bg-<name>/text-<name>/border-<name>, radius as rounded-card.
- Style guide: 6-10 concrete rules in Tailwind terms, e.g. "cards: bg-surface rounded-card shadow-sm", "grid: 1/2/3 columns at sm/md/lg", "status badges: success/warning/danger".
