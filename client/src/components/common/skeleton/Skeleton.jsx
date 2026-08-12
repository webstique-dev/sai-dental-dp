import MuiSkeleton from '@mui/material/Skeleton'

/**
 * Base Skeleton component wrapping MUI Skeleton with site theme defaults.
 * Supports: width, height, variant ('text'|'circular'|'rectangular'|'rounded'),
 * borderRadius, animation ('wave'|'pulse'|false), responsive sizing.
 */
export function Skeleton({
  variant = 'rounded',
  width = '100%',
  height,
  borderRadius,
  animation = 'wave',
  className = '',
  style = {},
  sx = {},
}) {
  const customSx = {
    bgcolor: 'rgba(26, 60, 43, 0.08)',
    ...(borderRadius !== undefined ? { borderRadius } : {}),
    ...sx,
  }

  return (
    <MuiSkeleton
      variant={variant}
      width={width}
      height={height}
      animation={animation}
      className={`app-skeleton ${className}`}
      style={style}
      sx={customSx}
      aria-busy="true"
      aria-live="polite"
    />
  )
}

export default Skeleton
