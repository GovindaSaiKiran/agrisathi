---
name: AgriSaathi
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#3f493f'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#6f7a6e'
  outline-variant: '#becabc'
  surface-tint: '#006d30'
  primary: '#00652c'
  on-primary: '#ffffff'
  primary-container: '#15803d'
  on-primary-container: '#d3ffd5'
  inverse-primary: '#79db8d'
  secondary: '#006e2d'
  on-secondary: '#ffffff'
  secondary-container: '#7cf994'
  on-secondary-container: '#007230'
  tertiary: '#004cca'
  on-tertiary: '#ffffff'
  tertiary-container: '#2865ed'
  on-tertiary-container: '#f2f2ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#95f8a7'
  primary-fixed-dim: '#79db8d'
  on-primary-fixed: '#00210a'
  on-primary-fixed-variant: '#005323'
  secondary-fixed: '#7ffc97'
  secondary-fixed-dim: '#62df7d'
  on-secondary-fixed: '#002109'
  on-secondary-fixed-variant: '#005320'
  tertiary-fixed: '#dbe1ff'
  tertiary-fixed-dim: '#b4c5ff'
  on-tertiary-fixed: '#00174b'
  on-tertiary-fixed-variant: '#003ea8'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  edge-margin: 16px
  stack-gap: 12px
---

## Brand & Style
The design system is rooted in the "Modern Agricultural" aesthetic—a blend of technical precision and organic warmth. It is designed to feel like a dependable companion for farmers, prioritizing utility, clarity, and a connection to the natural world.

The style leverages **Corporate Modern** principles with a **Tactile** edge. It avoids overly abstract concepts in favor of clear, high-contrast interfaces that remain legible under direct sunlight. The visual language is grounded, utilizing generous whitespace and structured layouts to reduce cognitive load for users who may be multitasking in the field.

## Colors
The palette is inspired by lush vegetation and clear skies, balanced by a clean, paper-like background to ensure maximum readability.

- **Primary (#15803d):** Used for top app bars, brand moments, and critical navigation headers to establish authority and trust.
- **Action (#16a34a):** A slightly more vibrant green reserved strictly for primary interactive elements like buttons and toggles.
- **Neutral (#f9fafb):** The canvas color. It provides a soft, off-white surface that reduces glare compared to pure white.
- **Functional Blue (#2563eb):** Dedicated to weather data and technical insights, creating a clear mental model for different types of information.
- **Functional Orange (#ea580c):** High-visibility tone for pests, drought warnings, or urgent system alerts.

## Typography
This design system utilizes **Inter** for its exceptional legibility and systematic weight distribution. 

To account for outdoor usage, the default body size is set slightly larger than standard (16px/18px). Contrast ratios must always exceed WCAG AA standards. Headlines use a tighter letter-spacing for a modern, compact feel, while labels utilize slight tracking to maintain clarity at small sizes. Use bold weights (600+) for critical data points like crop prices or weather degrees to ensure they are glanceable.

## Layout & Spacing
The layout follows a **fluid grid** model optimized for mobile-first interaction. 

- **Margins:** A consistent 16px (md) margin is applied to the left and right of the screen.
- **Vertical Rhythm:** Elements are stacked using a 12px or 16px gap to maintain a distinct separation between "tappable" cards.
- **Touch Targets:** All interactive elements (buttons, inputs, icons) must maintain a minimum height of 48px to accommodate usage with gloves or in motion.
- **Bottom Navigation:** A fixed bar provides 4-5 core destinations, ensuring the thumb-zone is always utilized for primary app switching.

## Elevation & Depth
The design system uses a "Low-Contrast Outline" approach combined with "Ambient Shadows" to define hierarchy without creating visual clutter.

- **Level 0 (Background):** The neutral off-white (#f9fafb).
- **Level 1 (Cards):** Pure white surfaces (#ffffff) featuring a 1px border in #f3f4f6. These use a very soft, diffused shadow (Y: 2, Blur: 4, Opacity: 4%) to lift them slightly from the background.
- **Level 2 (Active/Floating):** Used for floating action buttons or active menus. Shadows are increased in spread to indicate they sit "above" the content cards.
- **Tonal Tiers:** For informational sections (Weather/Alerts), depth is created via subtle background tints rather than physical elevation.

## Shapes
The shape language is "Rounded" to evoke a friendly, approachable, and organic feeling. 

Standard components like cards and input fields use a **16px (1rem)** radius. Smaller components like badges and chips use a "Pill" (full-round) radius to distinguish them as discrete metadata units. Primary buttons utilize a slightly tighter 8px-12px radius to feel more "action-oriented" and sturdy compared to the softer container cards.

## Components
- **Cards:** The primary container. White background, 16px corner radius, 1px #f3f4f6 border. Padding should be 16px internally.
- **Buttons:** 
  - *Primary:* Solid #16a34a with white text, bold weight.
  - *Secondary:* White background with #16a34a border and text.
- **Badges:** 
  - *Eligibility:* Soft green background with deep green text.
  - *Alerts:* Soft orange (#fff7ed) with vibrant orange (#ea580c) text.
- **Input Fields:** 16px rounded corners, 1px border, with a label floating or positioned clearly above. Active state uses the Primary Green for the border.
- **Navigation Bar:** Fixed to the bottom. Uses a white background with a subtle top border. Icons are 24px Lucide icons; active state uses Primary Green, inactive state uses a mid-gray.
- **Headers:** Solid #15803d background. All text and icons within the header must be pure white for high contrast.
- **Weather Widget:** A specialized card using #eff6ff background and #2563eb for icons and primary data points.