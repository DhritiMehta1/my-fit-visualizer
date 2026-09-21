# Refine the 3D miniature

## What will change
- Reshape the current body into a more natural human silhouette while keeping it driven by the entered measurements.
- Add anatomical landmarks: shoulders, elbows, knees, ankles, neck transitions, jaw, nose, ears, hands, thumbs, fingers, and shaped feet.
- Improve the pose so limbs sit naturally instead of reading as straight tubes.
- Keep all selected garments fitted to the same measurement-based body and preserve spin/orbit controls.

## Visual direction
- A polished atelier mannequin: recognizably human and detailed, but neutral enough for clothing previews.
- Softer skin shading and subtle facial features without inventing the user’s identity from measurements alone.

## Technical details
- Extend the procedural Three.js figure rather than replacing it with a fixed stock person, so body measurements continue to change the model.
- Build hands, fingers, feet, facial features, and joint shaping from reusable low-poly geometry sized from the body rig.
- Remove unsafe geometry assertions while touching the figure.
- Verify the fitting room in the browser at desktop and mobile sizes, including rotation and clothing layers.

## Boundary
- This improves anatomical realism. An exact face/body likeness from an uploaded photo would require a separate photo-to-avatar generation pipeline.
