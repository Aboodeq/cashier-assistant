import "./Button.css";

/**
 * variant: primary | soft | secondary | ghost | danger | danger-soft |
 *          success | success-soft | whatsapp
 * size:    sm | md | lg
 * Renders an <a> when `href` is given (external links, tel:, maps).
 */
export function Button({
  variant = "primary",
  size = "md",
  block = false,
  icon,
  iconEnd,
  loading = false,
  href,
  target,
  type = "button",
  disabled,
  className = "",
  children,
  ...rest
}) {
  const cls = [
    "ui-btn",
    `ui-btn--${variant}`,
    `ui-btn--${size}`,
    block && "ui-btn--block",
    children == null && "ui-btn--icon-only",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {loading ? <span className="ui-btn-spin" aria-hidden="true" /> : icon && <i className={icon} aria-hidden="true" />}
      {children != null && <span className="ui-btn-label">{children}</span>}
      {iconEnd && !loading && <i className={iconEnd} aria-hidden="true" />}
    </>
  );

  if (href) {
    return (
      <a
        className={cls}
        href={href}
        target={target}
        rel={target === "_blank" ? "noopener noreferrer" : undefined}
        {...rest}
      >
        {content}
      </a>
    );
  }
  return (
    <button type={type} className={cls} disabled={disabled || loading} {...rest}>
      {content}
    </button>
  );
}

export function IconButton({ icon, label, variant = "ghost", size = "md", ...rest }) {
  return <Button variant={variant} size={size} icon={icon} aria-label={label} title={label} {...rest} />;
}
