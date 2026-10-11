# Study Space --- Design System

> **Revision (2026-10-11, studay)** — The visual language follows a Toss-inspired
> structure adapted for a desktop web app, while keeping studay's own purple accent:
>
> - White canvas (`#FFFFFF`) with **borderless light-gray cards** (`#F7F8FA`); white blocks
>   (inputs, rows, stat boxes) sit inside cards when they need separation.
> - Larger radii: cards 16px, inputs 12px, dialogs 24px, **pill-shaped buttons**.
> - Key numbers are the hero of a card: 26–30px, weight 800, tight tracking. One
>   number per metric card; explanation below in secondary gray.
> - Secondary text `#4E5968`, tertiary `#6B7684`; body weight 500.
> - One primary (purple) button per screen region; other actions are white
>   outlined or text buttons.
> - Desktop-first layout with a persistent sidebar is kept. Mobile-only patterns
>   (bottom-fixed CTA) are not used. No Toss logos, slogans, colors-as-identity,
>   or exact screens are copied, and no affiliation is implied.
>
> Where this note conflicts with older sections below, this note wins.

## 1. Design Intent

Study Space is a personal study planner for university students. The
interface should feel calm, clear, lightweight, and trustworthy.

The visual direction is inspired by the clarity and restraint of modern
Korean digital products such as Toss. This is a design reference, not a
request to copy Toss branding or proprietary UI.

### Principles

1.  **Clarity over decoration** --- users should understand what needs
    attention within a few seconds.
2.  **Hierarchy through spacing** --- use spacing, typography, and
    alignment before adding borders or colors.
3.  **Minimal elevation** --- avoid unnecessary shadows, glow effects,
    heavy gradients, and floating-card overload.
4.  **Consistent behavior** --- the same action should look and behave
    the same throughout the app.
5.  **Data first** --- charts, timers, and progress indicators must
    represent real data, not decorative placeholders.
6.  **Accessible by default** --- readable contrast, visible keyboard
    focus, proper labels, and clear error states.

## 2. Typography

### Preferred font

Use **Pretendard** as the primary typeface.

Suggested CSS:

``` css
font-family: "Pretendard", -apple-system, BlinkMacSystemFont, "Segoe UI",
  sans-serif;
```

If the project uses a reliable local font package or hosted font file,
configure it centrally. Provide sensible system fallbacks.

### Type scale

  -------------------------------------------------------------------------
  Token                 Suggested size               Weight Use
  --------------- -------------------- -------------------- ---------------
  `text-xs`                       12px             400--500 Helper text,
                                                            timestamps,
                                                            secondary
                                                            metadata

  `text-sm`                       14px             400--500 Table cells,
                                                            descriptions,
                                                            form controls

  `text-base`                     16px             400--500 Default body
                                                            text

  `text-lg`                       18px                  600 Card titles,
                                                            section
                                                            subheads

  `text-xl`                       20px             600--700 Page section
                                                            titles

  `text-2xl`                      24px             650--700 Page titles,
                                                            key metric
                                                            values

  `text-3xl`                      30px             650--700 Prominent timer
                                                            or headline
                                                            metric
  -------------------------------------------------------------------------

Use larger type sparingly. Do not make every card title large. Body copy
should remain easy to scan.

### Typography rules

-   Use a consistent hierarchy across all pages.
-   Use tabular numerals for timers, durations, and statistics where
    supported.
-   Prefer short labels and concise Korean copy.
-   Avoid all-caps labels as a default.
-   Do not use low-contrast gray for important content.
-   Use weight and spacing before introducing another color.

## 3. Color

Use a mostly neutral interface with one restrained primary accent. The
palette below is a starting point; centralize it as design tokens and
adjust for contrast.

``` css
:root {
  --background: #FFFFFF;       /* canvas */
  --card: #F7F8FA;             /* borderless section cards */
  --surface: #FFFFFF;          /* inputs, dialogs, white blocks inside cards */
  --surface-subtle: #EEF0F3;   /* hover fills, segmented tracks */
  --border: #E5E8EB;
  --border-strong: #D1D6DB;

  --text-primary: #191F28;
  --text-secondary: #4E5968;
  --text-tertiary: #6B7684;

  --primary: #6C5CE7;
  --primary-hover: #5B4BD8;
  --primary-subtle: #F0EEFF;

  --success: #16845B;
  --success-subtle: #E8F7EF;
  --warning: #B7791F;
  --warning-subtle: #FFF4D6;
  --danger: #D64545;
  --danger-subtle: #FFF0F0;

  --focus-ring: #8A7CFF;
}
```

### Color usage

-   Background: white canvas.
-   Content cards: light gray (`--card`), no border. White blocks inside cards
    for inputs, list rows, and stat boxes.
-   Primary accent: use for the main action, selected navigation, active
    timer, and selected date.
-   Success: completed tasks and successful actions.
-   Warning: due-soon states and caution.
-   Danger: destructive actions, overdue states when appropriate, and
    validation errors.
-   Subject colors: allow a user-selected color per subject, but use
    those colors mainly for small dots, labels, and progress indicators.

Do not use many saturated colors at the same time. Avoid using color
alone to communicate status; pair it with text or an icon.

## 4. Layout and Spacing

### Desktop-first layout

-   Target a comfortable desktop workspace from approximately 1280px
    wide.
-   Sidebar: approximately 220--248px wide.
-   Main content: flexible width with a reasonable maximum width for
    reading-heavy views.
-   Page gutters: 28--36px on desktop; reduce progressively at narrower
    widths.
-   Use a consistent spacing scale based on 4px increments: 4, 8, 12,
    16, 20, 24, 32, 40, 48.
-   Use a 12-column grid only when it helps; do not force every view
    into complex columns.

### Main dashboard

Recommended hierarchy: 1. Page greeting/title and primary action. 2. Two
to four key metric cards. 3. Today's TODO list. 4. Subject progress or
weekly study summary. 5. Optional upcoming deadlines.

Keep the most actionable content above the fold. Avoid showing too many
metrics at once.

### Sidebar

-   Persistent on desktop.
-   Clear selected state using a subtle tinted background and accent
    icon/text.
-   Use simple line icons with consistent size and stroke.
-   Group primary navigation separately from settings.
-   Do not rely on icon-only navigation for the main menu; show text
    labels.

### Responsive behavior

-   Desktop is the primary design target.
-   On medium screens, reduce grid columns and card padding.
-   On narrow screens, collapse the sidebar into a drawer or compact
    navigation.
-   Prevent horizontal overflow in tables and calendar views.
-   Keep timer controls accessible at smaller widths.

## 5. Surfaces, Cards, Borders, and Shadows

### Cards

-   Use borderless light-gray cards on the white canvas.
-   Radius: 16px for cards, 12px for inputs and inner blocks, 24px for dialogs,
    fully rounded (pill) buttons.
-   Do not add borders to cards; separate by surface color and spacing.
-   Use padding around 16--24px depending on density.
-   Avoid nesting cards inside cards unless there is a strong
    information-architecture reason.

### Shadows

**Default: no shadow.**

Use borders, surface contrast, and whitespace to separate elements. If
elevation is genuinely needed for a popover or modal, use a very subtle
shadow. Never use large blurred shadows, colored glows, or shadow-heavy
dashboard cards.

### Gradients and decoration

-   Avoid decorative gradients as a default.
-   Do not use glassmorphism, neon glow, excessive blur, or floating 3D
    elements.
-   Avoid illustrations that do not help users complete a task.
-   Empty states may use a small, restrained icon rather than a large
    decorative illustration.

## 6. Components

### Buttons

-   Primary: solid primary accent, white text, clear label.
-   Secondary: neutral surface with a subtle border.
-   Tertiary: text-only for low-emphasis actions.
-   Destructive: use danger styling and confirmation for irreversible
    actions.
-   Suggested height: 40--44px for primary controls; compact controls
    can be 32--36px.
-   Provide hover, active, disabled, and keyboard-focus states.
-   Button labels should describe the action: "과목 추가", "TODO 저장",
    "공부 종료".

### Inputs and forms

-   Use persistent labels; do not rely only on placeholders.
-   Keep related fields grouped.
-   Validate inline and explain how to fix an error.
-   Clearly distinguish optional fields.
-   Ensure keyboard focus is visible.
-   Confirm before destructive actions.

### TODO rows

Each row should make these easy to scan: - completion checkbox - title -
subject/category metadata where useful - due date - priority - optional
estimated duration

Avoid displaying every metadata field in every context. On the
dashboard, show only the information needed to decide what to do next.

### Status badges

-   Use small, restrained badges.
-   Reserve bright colors for meaningful states.
-   Do not turn every category or piece of metadata into a colorful
    pill.
-   Pair status color with readable text.

### Timer

-   Make elapsed time the visual focus.
-   Use tabular numerals to prevent width shifts.
-   Make Start, Pause, Resume, and Finish controls distinct and
    unambiguous.
-   Show the selected subject and optional linked TODO.
-   Communicate save state or errors when relevant.
-   Avoid a large decorative circular timer unless usability testing
    shows it helps.

### Calendar

-   Use a clear month header and predictable navigation.
-   Keep day cells readable and evenly spaced.
-   Use subject colors for small dots or a narrow marker rather than
    filling entire cells with saturated colors.
-   Show selected day using a restrained accent treatment.
-   Distinguish TODO deadlines from independent events with labels or
    icons as well as color.

### Charts

-   Use a small, consistent set of colors.
-   Label axes and time ranges.
-   Include accessible summaries or values alongside charts.
-   Show an informative empty state when there is not enough data.
-   Do not use 3D charts or decorative chart effects.

### Modals and popovers

-   Use for short, focused tasks only.
-   Avoid deeply nested dialogs.
-   Keep primary and secondary actions in consistent positions.
-   Provide keyboard and focus management.

## 7. Iconography

-   Use a consistent line-icon library such as Lucide.
-   Keep icon sizes consistent: 16px for compact inline use, 18--20px
    for controls, 20--24px for navigation.
-   Use icons to reinforce text, not replace important labels.
-   Avoid mixing emoji, filled icons, outlined icons, and unrelated icon
    styles.
-   Ensure decorative icons are hidden from assistive technology when
    appropriate.

## 8. Motion and Interaction

-   Motion should explain a state change, not decorate the interface.
-   Use short transitions, approximately 120--200ms, for hover and
    selection states.
-   Avoid bouncy transitions, parallax, and continuous animations.
-   Respect `prefers-reduced-motion`.
-   Do not animate large dashboard regions when a small state change is
    sufficient.

## 9. States and Feedback

Every data-driven screen should handle: - Loading state - Empty state -
Error state - Success feedback - Disabled state -
Permission/unauthenticated state

Examples: - No subjects: "아직 등록한 과목이 없어요." with an "과목
추가" action. - No TODOs today: "오늘 예정된 할 일이 없어요." - No study
records: explain that records will appear after the first timer
session. - Save error: tell the user the change was not saved and
provide a retry path. - Timer running: persist and display its status
consistently across navigation.

Do not silently discard user input after a network error.

## 10. Accessibility

-   Use semantic HTML and correct heading hierarchy.
-   All controls must be keyboard accessible.
-   Show a visible focus indicator.
-   Associate form labels and validation messages with their inputs.
-   Maintain sufficient contrast for text and controls.
-   Do not use color as the only status signal.
-   Provide accessible names for icon-only buttons.
-   Use sensible hit targets and avoid tiny interactive elements.
-   Respect reduced-motion settings.

## 11. Content and Microcopy

Write in natural, concise Korean. The product should sound helpful and
calm, not overly cute or corporate.

Preferred: - "과목 추가" - "할 일을 추가해 보세요." - "오늘 공부한
시간" - "마감일을 선택해 주세요." - "저장하지 못했어요. 다시 시도해
주세요." - "공부를 종료하고 기록할까요?"

Avoid: - overly enthusiastic exclamation marks - vague labels such as
"진행하기" when the action can be named - unnecessary English terms when
a clear Korean label exists - guilt-inducing copy about missed goals

English can be used for short page labels if the product consistently
adopts bilingual navigation, but Korean is the default for user-facing
controls.

## 12. Do / Don't

### Do

-   Use Pretendard consistently.
-   Use neutral backgrounds and restrained accent color.
-   Build hierarchy with spacing and typography.
-   Use subtle borders instead of heavy shadows.
-   Keep dashboard cards purposeful.
-   Show real, clearly defined metrics.
-   Design empty, loading, error, and success states.
-   Make forms and timer controls predictable.

### Don't

-   Do not add shadows to every card.
-   Do not use large gradients or glowing purple effects.
-   Do not decorate every section with a different color.
-   Do not use excessive pill badges.
-   Do not use placeholder metrics as real data.
-   Do not add charts that do not support a user decision.
-   Do not imitate proprietary brand assets or copy another product's
    exact screens.

## 13. Definition of Done for UI

A screen is ready when: - It follows the typography, color, spacing, and
surface tokens. - Its primary action is obvious. - It has loading,
empty, error, and success states where relevant. - It works with
keyboard navigation. - It does not rely on shadows or color alone to
convey hierarchy. - It uses real data or explicitly marked sample
data. - It has been checked at desktop and narrower viewport widths.
