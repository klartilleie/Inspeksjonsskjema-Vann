# Design Guidelines: Norwegian Wastewater System Inspection Form

## Design Approach

**Selected Approach:** Design System - Material Design adapted for professional forms
**Justification:** This is a utility-focused data collection tool requiring clear information hierarchy, efficient data entry, and professional appearance. Material Design's robust form patterns and emphasis on structure make it ideal for multi-section inspection forms.

**Core Principles:**
- Clarity and efficiency in data entry
- Clear visual sectioning for form progression
- Professional, trustworthy appearance for official documentation
- Accessible form controls with clear labels and validation

## Typography

**Font Family:** Inter or Roboto via Google Fonts CDN
- Primary: 400 (regular), 500 (medium), 600 (semibold)

**Hierarchy:**
- Page Title (H1): 2rem/32px, semibold - "BEFARINGSSKJEMA: LETT AVLØPS-/GRÅVANNSYSTEM"
- Section Headers (H2): 1.25rem/20px, semibold - e.g., "1. Kunde- og Prosjektdetaljer"
- Field Labels: 0.875rem/14px, medium - all form labels
- Input Text: 1rem/16px, regular - user input
- Helper Text: 0.75rem/12px, regular - validation messages, character counts

## Layout System

**Spacing Units:** Tailwind units of 2, 4, 6, 8, 12, 16, 20
- Form sections: mb-12 between major sections
- Field groups: mb-6 within sections
- Label-to-input: mb-2
- Container padding: px-4 md:px-8, py-8

**Container:**
- Max width: max-w-4xl mx-auto (optimal form reading width)
- Single column layout throughout for form clarity
- Responsive padding: p-4 on mobile, p-8 on desktop

## Component Library

### Form Structure
**Section Cards:**
- Each major section (1-5) in distinct card container
- Padding: p-6 md:p-8
- Spacing between sections: mb-8
- Subtle border/elevation to separate sections

### Form Controls

**Text Inputs:**
- Full width within container
- Height: h-12
- Padding: px-4
- Border radius: rounded-lg
- Clear focus states with outline

**Radio Buttons:**
- Vertical stacking for clarity
- Each option with p-3 touch target
- Clear visual selection state
- Labels aligned with radio circles

**Date/Time Picker:**
- Standard input with calendar icon
- Height: h-12 matching text inputs

**Textarea (Comments):**
- Min height: min-h-32
- Resize capability
- Clear section labeling

**File Upload Zone:**
- Prominent drag-and-drop area
- Minimum dimensions: h-48
- Clear "5 bilder minimum" requirement
- Upload counter display
- Thumbnail preview grid below upload zone

**Buttons:**
- Primary action (Submit): h-12, px-8, rounded-lg, full width on mobile
- Secondary actions: outlined variant
- Clear disabled states during upload/submission

### Validation & Feedback
- Inline validation messages below fields
- Required field indicators (* or "Påkrevd")
- Success confirmation modal/message after submission
- Error summary at top of form if submission fails

## Section-Specific Layout

**Section 1-4:** Standard form layout with labels above inputs
**Section 5 (Documentation):** 
- Prominent file upload area at top
- Image counter: "X av minimum 5 bilder lastet opp"
- Grid display of uploaded thumbnails (grid-cols-2 md:grid-cols-3 gap-4)
- Comments textarea below upload area

## Form Flow & Navigation

**Progress Indication:**
- Section numbers clearly visible in headers
- Optional: Simple progress bar showing completion (5 sections)

**Sticky Submit Button (Desktop):**
- Bottom-right fixed position on larger screens
- Mobile: Bottom of form in natural flow

## Accessibility
- All form fields with proper labels (for/id associations)
- Required fields clearly marked
- Error messages associated with fields (aria-describedby)
- Keyboard navigation fully supported
- Focus management for file uploads

**No Images Required:** This is a pure form application - no hero images or decorative imagery needed. Focus entirely on clean, efficient form design.