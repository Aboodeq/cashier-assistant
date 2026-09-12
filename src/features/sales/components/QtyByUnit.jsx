import { Input } from "../../../components/ui/Form";
import { availableUnits } from "../domain/packaging";

/**
 * One small box per packaging level ("2 كرتون + 3 علبة") — how goods are
 * actually counted when loading the van or doing the end-of-day count.
 */
export default function QtyByUnit({ product, value = {}, onChange, ariaPrefix = "" }) {
  const units = availableUnits(product);
  return (
    <div className="sl-qty-units">
      {units.map((unit) => (
        <label key={unit.value} className="sl-qty-unit">
          <Input
            type="number"
            inputMode="numeric"
            min="0"
            step="any"
            placeholder="0"
            value={value[unit.value] ?? ""}
            aria-label={`${ariaPrefix} ${unit.label}`}
            onChange={(e) => onChange({ ...value, [unit.value]: e.target.value })}
            onFocus={(e) => e.target.select()}
          />
          <span className="sl-qty-unit-label">{unit.label}</span>
        </label>
      ))}
    </div>
  );
}
