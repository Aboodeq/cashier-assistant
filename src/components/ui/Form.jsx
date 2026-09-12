import { useId } from "react";
import "./Form.css";

export function Field({ label, hint, error, required, htmlFor, className = "", children }) {
  return (
    <div className={`ui-field ${className}`}>
      {label && (
        <label className="ui-field-label" htmlFor={htmlFor}>
          {label}
          {required && <span className="ui-field-req">*</span>}
        </label>
      )}
      {children}
      {error ? <div className="ui-field-error">{error}</div> : hint ? <div className="ui-field-hint">{hint}</div> : null}
    </div>
  );
}

export function Input({ prefix, suffix, className = "", ...rest }) {
  if (prefix == null && suffix == null) return <input className={`ui-input ${className}`} {...rest} />;
  return (
    <div className={`ui-input-wrap ${className}`}>
      {prefix != null && <span className="ui-input-adorn">{prefix}</span>}
      <input className="ui-input ui-input--bare" {...rest} />
      {suffix != null && <span className="ui-input-adorn">{suffix}</span>}
    </div>
  );
}

export function Select({ options, placeholder, className = "", children, ...rest }) {
  return (
    <div className={`ui-select ${className}`}>
      <select className="ui-input ui-select-el" {...rest}>
        {placeholder != null && <option value="">{placeholder}</option>}
        {options
          ? options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))
          : children}
      </select>
      <i className="fa-solid fa-chevron-down ui-select-caret" aria-hidden="true" />
    </div>
  );
}

export function Textarea({ className = "", ...rest }) {
  return <textarea className={`ui-input ui-textarea ${className}`} {...rest} />;
}

export function TextField({ label, hint, error, required, className = "", ...inputProps }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={id} className={className}>
      <Input id={id} required={required} {...inputProps} />
    </Field>
  );
}

export function SelectField({ label, hint, error, required, className = "", ...selectProps }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={id} className={className}>
      <Select id={id} required={required} {...selectProps} />
    </Field>
  );
}

export function TextAreaField({ label, hint, error, className = "", ...rest }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id} className={className}>
      <Textarea id={id} {...rest} />
    </Field>
  );
}

/** Numeric money input with the currency shown inside the box. */
export function MoneyField({ currency, ...rest }) {
  return (
    <TextField
      type="number"
      inputMode="decimal"
      min="0"
      step="any"
      placeholder="0"
      suffix={currency === "USD" ? "$" : currency === "SYP" ? "ل.س" : undefined}
      {...rest}
    />
  );
}

export function Segmented({ value, onChange, options, size = "md", block = true, className = "" }) {
  return (
    <div className={`ui-seg ui-seg--${size} ${block ? "ui-seg--block" : ""} ${className}`} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`ui-seg-opt ${value === o.value ? "is-on" : ""}`}
          onClick={() => onChange(o.value)}
          disabled={o.disabled}
        >
          {o.icon && <i className={o.icon} aria-hidden="true" />}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, hint, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`ui-switch ${checked ? "is-on" : ""}`}
      onClick={() => onChange(!checked)}
      disabled={disabled}
    >
      <span className="ui-switch-text">
        <span className="ui-switch-label">{label}</span>
        {hint && <span className="ui-switch-hint">{hint}</span>}
      </span>
      <span className="ui-switch-track">
        <span className="ui-switch-thumb" />
      </span>
    </button>
  );
}

export function Stepper({ value, onChange, min = 0, step = 1, placeholder = "0", size = "md", ariaLabel }) {
  const n = Number(value) || 0;
  return (
    <div className={`ui-stepper ui-stepper--${size}`}>
      <button type="button" className="ui-stepper-btn" onClick={() => onChange(String(n + step))} aria-label="زيادة">
        <i className="fa-solid fa-plus" />
      </button>
      <input
        className="ui-stepper-input"
        type="number"
        inputMode="decimal"
        min={min}
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.target.select()}
      />
      <button
        type="button"
        className="ui-stepper-btn"
        onClick={() => onChange(n - step <= min ? (min === 0 ? "" : String(min)) : String(n - step))}
        disabled={n <= min}
        aria-label="إنقاص"
      >
        <i className="fa-solid fa-minus" />
      </button>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "بحث...", autoFocus, className = "" }) {
  return (
    <div className={`ui-search ${className}`}>
      <i className="fa-solid fa-magnifying-glass ui-search-ico" aria-hidden="true" />
      <input
        className="ui-search-input"
        type="search"
        enterKeyHint="search"
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button type="button" className="ui-search-clear" onClick={() => onChange("")} aria-label="مسح البحث">
          <i className="fa-solid fa-xmark" />
        </button>
      )}
    </div>
  );
}

/** Responsive field grid: `cols` on wide screens, collapsing on phones. */
export function FormGrid({ cols = 2, keepCols = false, className = "", children }) {
  return (
    <div className={`ui-grid ui-grid--${cols} ${keepCols ? "ui-grid--keep" : ""} ${className}`}>{children}</div>
  );
}
