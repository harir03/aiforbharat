# UBID Platform Design System
## Based on Vercel Geist + UBID Teal Palette

### Core Philosophy
Vercel's shadow-as-border technique, Geist typography compression, and UBID's teal identity palette.

### Brand Palette
- **Primary Teal**: `#2E6D7A`
- **Primary Dark**: `#1E4D58`
- **Primary Light**: `#D4EEF2`

### Status Palette
- **Active**: text `#065F46`, bg `#D1FAE5` (green)
- **Dormant**: text `#92400E`, bg `#FEF3C7` (amber)
- **Closed**: text `#991B1B`, bg `#FEE2E2` (red)
- **Pending**: text `#475467`, bg `#F2F4F7` (gray)

### Department Colours
- **Factories**: blue (`#0a72ef` / `#EBF5FF`)
- **KSPCB**: green (`#065F46` / `#D1FAE5`)
- **Labour**: orange (`#92400E` / `#FEF3C7`)
- **Shop Est**: purple (`#7928ca` / `#F3E8FF`)

### Typography
- **Font**: Geist Sans (via next/font/google or local), fallback to Inter
- **Display**: 48px, weight 600, letter-spacing -2.4px
- **Section Heading**: 32px, weight 600, letter-spacing -1.28px
- **Card Title**: 24px, weight 600, letter-spacing -0.96px
- **Body**: 16px, weight 400
- **Caption/Label**: 12px, weight 500, uppercase for technical labels
- **Mono**: Geist Mono for UBIDs, codes, technical values

### Shadows (Vercel System)
- **Border Shadow**: `rgba(0,0,0,0.08) 0px 0px 0px 1px` (replaces CSS borders)
- **Card**: `rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 2px`
- **Card Hover**: `rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.06) 0px 4px 8px`
- **Full Card**: `rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 2px, rgba(0,0,0,0.04) 0px 8px 8px -8px, #fafafa 0px 0px 0px 1px`

### Buttons
- **Primary**: bg `#1E4D58`, text white, radius 6px, hover bg `#2E6D7A`
- **Ghost**: bg white, shadow-border, text `#171717`, hover bg `#fafafa`
- **Danger**: bg `#FEE2E2`, text `#991B1B`
- **Badge/Pill**: radius 9999px, small text

### Border Radius
- 6px: buttons, inputs
- 8px: cards
- 12px: featured panels
- 9999px: badges, pills

### Focus
- Ring: `0px 0px 0px 2px #2E6D7A` (uses brand teal instead of Vercel blue)

### Spacing
- Base unit: 8px
- Card padding: 20px–24px
- Section gap: 24px
- Content max-width: 1200px
