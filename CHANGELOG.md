# Changelog

## [Unreleased]

### Fixed
- **P0** Core display logic: images are now always scaled to `displayWidth` (was: small images stayed small, only large images were constrained)
- **P1** Loading/error text contrast on white overlay background
- **P2** `positionOverlaySmartly()` triggers `requestAnimationFrame` on every mousemove (performance)

### Changed
- Replaced `zoomFactor` (multiplier) with `displayWidth` (fixed pixel target) — all enlarged images now display at a consistent size regardless of original dimensions
- Removed `minImageSize` and `maxEnlargedSize` settings (no longer needed with fixed-width approach)
- Unified hover delay default: 100ms (was 300ms in popup.js resetDefaults)

### Added
- Image overflow now scrolls properly (`overflow: auto`)
- Zoom controls removed (not user-friendly for hover interaction)
- Overlay blocks mouse events (`pointer-events: none`) to prevent triggering source images
- Lazy-loaded images (with `width: 0` before load) now supported via `load`/`error` event listeners
- Video features removed — extension now focuses on images only

## [1.0] - 2026-05-10

### Initial release

### Changed
- Replaced `zoomFactor` (multiplier) with `displayWidth` (fixed pixel target) — all enlarged images now display at a consistent size regardless of original dimensions
- Removed `minImageSize` and `maxEnlargedSize` settings (no longer needed with fixed-width approach)
- Unified hover delay default: 100ms (was 300ms in popup.js resetDefaults)

### Added
- Image overflow now scrolls properly (`overflow: auto`)
- Zoom controls removed (not user-friendly for hover interaction)
- Overlay blocks mouse events (`pointer-events: none`) to prevent triggering source images

## [1.0] - 2026-05-10

### Initial release
