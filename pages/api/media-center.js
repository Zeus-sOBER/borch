/**
 * DEPRECATED — This was an old v1 Media Center page accidentally placed
 * in the api/ folder. The real Media Center lives at pages/media-center.js.
 * This file now returns a 404. Safe to delete entirely.
 */
export default function handler(req, res) {
  return res.status(404).json({
    error: 'This endpoint does not exist. Visit /media-center instead.',
  })
}
