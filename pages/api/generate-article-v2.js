/**
 * DEPRECATED — this file is no longer used.
 * All functionality has been merged into generate-article.js
 * You can safely delete this file.
 */

export default function handler(req, res) {
  res.status(301).json({
    error: 'This endpoint is deprecated. Use /api/generate-article instead.',
    redirect: '/api/generate-article'
  });
}
