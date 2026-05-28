---
name: Swift Commerce
colors:
  surface: '#f8f9fb'
  surface-dim: '#d9dadc'
  surface-bright: '#f8f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#edeef0'
  surface-container-high: '#e7e8ea'
  surface-container-highest: '#e1e2e4'
  on-surface: '#191c1e'
  on-surface-variant: '#47464c'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f3'
  outline: '#78767d'
  outline-variant: '#c8c5cd'
  surface-tint: '#5d5c74'
  primary: '#00000b'
  on-primary: '#ffffff'
  primary-container: '#1a1a2e'
  on-primary-container: '#83829b'
  inverse-primary: '#c6c4df'
  secondary: '#4b41e1'
  on-secondary: '#ffffff'
  secondary-container: '#645efb'
  on-secondary-container: '#fffbff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002114'
  on-tertiary-container: '#009768'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e0fc'
  primary-fixed-dim: '#c6c4df'
  on-primary-fixed: '#1a1a2e'
  on-primary-fixed-variant: '#45455b'
  secondary-fixed: '#e2dfff'
  secondary-fixed-dim: '#c3c0ff'
  on-secondary-fixed: '#0f0069'
  on-secondary-fixed-variant: '#3323cc'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9fb'
  on-background: '#191c1e'
  surface-variant: '#e1e2e4'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  caption:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  micro:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.6px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  padding-h: 20px
  padding-v: 16px
  gutter: 12px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
---

## Brand & Style

This design system is built for high-velocity transaction environments where clarity and reliability are paramount. The brand personality is **Minimal and Professional**, stripping away visual noise to focus entirely on commerce workflows. 

The aesthetic follows a **Corporate / Modern** approach with a slight lean toward **Minimalism**. It utilizes a systematic hierarchy, generous white space, and a restricted color palette to reduce cognitive load for operators. The emotional goal is to evoke a sense of "quiet efficiency"—the UI should feel like a high-performance tool that disappears into the background, allowing the merchant's tasks to take center stage.

## Colors

The palette is anchored by **Deep Navy (#1A1A2E)** to establish brand authority, while **Indigo (#4F46E5)** serves as the functional accent for interactive elements and primary calls to action. 

The background is a cool **#F8F9FB**, providing a soft canvas that reduces screen glare during long shifts. Surface colors are strictly white to create clear separation for actionable containers. Semantic colors (Emerald, Amber, Red) are reserved for status indicators, transaction success states, and critical inventory alerts to ensure they remain highly scannable.

## Typography

This design system uses **Inter** across all levels to maintain a systematic and utilitarian feel. The hierarchy is optimized for legibility in fast-paced retail or hospitality settings. 

- **Headlines** use tight tracking and bold weights to anchor page sections.
- **Body Text** is set at 15px to ensure accessibility on mobile screens while maximizing information density.
- **Micro Labels** utilize uppercase styling and increased letter spacing for categorization and non-interactive data points. 

On mobile devices, headlines scale down slightly to avoid awkward line breaks, ensuring that product names and prices remain the primary focus.

## Layout & Spacing

The layout follows a **Fluid Grid** model optimized for touch targets. A base unit of **4px** governs all spatial relationships. 

- **Safe Areas:** Standard mobile screens utilize 20px horizontal padding to prevent content from touching the edges and 16px vertical padding for list items.
- **Touch Targets:** Interactive elements are spaced with a minimum of 12px gutters to prevent accidental taps.
- **Vertical Rhythm:** Elements are stacked using increments of 8px, 16px, or 24px depending on the logical grouping of commerce data (e.g., product info vs. checkout totals).

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Low-Contrast Outlines**. 

The background layer (#F8F9FB) sits at the lowest level. Surface elements like product cards and summary modules are raised using a single-pixel border (#E5E7EB) and a very subtle ambient shadow (`0 2px 8px rgba(0,0,0,0.06)`). This creates a "sheet" metaphor where the workspace feels organized and physical. 

High-elevation components, such as **Bottom Sheets**, use a stronger backdrop dimming (scrim) rather than heavy shadows to focus the user's attention on the specific task, such as processing a payment or selecting a product variant.

## Shapes

The shape language is **Rounded**, utilizing varied corner radii to distinguish between different component types. 

- **Inputs (10px)** and **Buttons (12px)** use slightly tighter corners to feel precise and actionable.
- **Cards (16px)** provide a softer container for data. 
- **Bottom Sheets (20px)** use a distinct top-radius to signal they are temporary overlays originating from the bottom of the device.
- **Chips** are fully pill-shaped (999px) to separate them visually from rectangular input fields.

## Components

### Buttons
- **Primary:** 52px height, Indigo fill, White text (Heading 3 weight). Full-width for checkout actions.
- **Secondary:** 52px height, White fill, 1.5px Indigo border, Indigo text. Used for "Add Note" or "Print Receipt".

### Input Fields
- **Standard:** 52px height, #F8F9FB background with 1px border. Placeholder text in Muted color.
- **Active State:** Border transitions to Indigo with a subtle focus glow.

### Cards & Lists
- **Product Card:** White background, 1px border. Elevation used only for the container, not individual items within a list.
- **List Items:** 64px minimum height to ensure comfortable touch-targets for scanning items in a cart.

### Navigation & Overlays
- **Bottom Tab Bar:** 56px fixed height, White background, 1px top border. Icons utilize Deep Navy for active states and Muted for inactive.
- **Bottom Sheets:** Rounded 20px top corners. Must include a centered handle/grabber (36x4px, Muted color) for discoverable dismissal.

### Feedback
- **Transaction Chips:** Use semantic background tints (e.g., 10% opacity of Success color) with full-strength text color for high-contrast status labeling.