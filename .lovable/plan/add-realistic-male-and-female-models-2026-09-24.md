# Add realistic male and female models

## What will change
- Add a clear Female / Male model selector in the body controls.
- Keep the same entered measurements, skin tone, clothing layers, and turntable controls when switching models.
- Save the selected model with the user’s body profile and restore it on return.

## Visual refinement
- Replace the doll-like facial treatment with subtler eyes, lips, brows, ears, nose, jaw, and hair.
- Refine shoulder, chest, waist, hip, arm, hand, leg, and foot proportions for two distinct adult silhouettes.
- Soften intersections at joints and use a relaxed, natural standing pose.

## Technical details
- Extend the measurement-driven procedural figure rather than substituting fixed stock bodies.
- Add a typed model-style value to the body rig and pass it through the fitting canvas.
- Derive gender-specific proportions from the same measurements so garment fitting remains responsive.
- Use the existing profile field for persistence, without changing the database schema.
- Verify both models, switching, clothing layers, rotation, and desktop/mobile layouts in the browser.
