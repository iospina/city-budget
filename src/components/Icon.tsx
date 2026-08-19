/**
 * Material Symbols Rounded icon (weight 400, fill on, optical size 20 — locked).
 * The font + variation settings are configured globally in index.css.
 */
interface IconProps {
  name: string;
  /** Pixel size; defaults to 20 (the locked optical size). */
  size?: number;
  className?: string;
  color?: string;
  /** Decorative by default; pass a label to expose it to assistive tech. */
  label?: string;
}

export function Icon({ name, size = 20, className = "", color, label }: IconProps) {
  return (
    <span
      className={`material-symbols-rounded ${className}`}
      style={{ fontSize: size, color }}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {name}
    </span>
  );
}
