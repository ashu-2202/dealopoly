# Dealopoly Design System

Source asset: `assets/1e0c949b477a4dc58073f8629bdcd2d5`

## Direction

Modern corporate gaming: a dark, high-contrast game board with tactile cards,
clean geometry, and restrained depth. The intended brand feel is competitive,
fun, and fast-paced.

## Core colors

| Token | Value |
| --- | --- |
| Board background | `#111415` |
| Lowest surface | `#0C0F10` |
| Standard surface | `#1D2021` |
| High surface | `#282A2B` |
| Bright surface | `#373A3B` |
| Primary blue | `#A8C8FF` |
| Primary container | `#0055A4` |
| Property green | `#66DF75` |
| Property container | `#27A644` |
| Rent orange | `#FFB77D` |
| Rent container | `#834500` |
| Main text | `#E1E3E4` |
| Secondary text | `#C2C6D3` |
| Error | `#FFB4AB` |

## Typography

| Role | Font | Size / line height | Weight |
| --- | --- | --- | --- |
| Display | Montserrat | `48px / 56px` | 800 |
| Headline | Montserrat | `32px / 40px` | 700 |
| Mobile headline | Montserrat | `24px / 32px` | 700 |
| Title | Montserrat | `20px / 28px` | 600 |
| Large body | Inter | `18px / 28px` | 400 |
| Body | Inter | `16px / 24px` | 400 |
| Data labels | JetBrains Mono | `12px / 16px` | 500 |

## Layout tokens

- Base unit: `4px`
- Spacing: `4px`, `8px`, `16px`, `24px`, `48px`
- Main content width: `1440px`
- Card-hand overlap: `-32px`
- Card corner radius: `1rem`
- Primary-action corner radius: `1.5rem` or full pill

## Component guidance

- Use a 12-column desktop board that collapses to a vertical mobile layout.
- Keep the player hand as the focal area; arrange bank and properties side by
  side on desktop.
- Use tonal layers and ambient shadows for a physical-card feel.
- Use a colored card header to distinguish card categories at a glance.
- Reserve primary blue for navigation/actions, green for property success,
  orange for rent, and red for danger or debt states.
