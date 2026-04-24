export default function ColorPicker({ colors, value, onChange }) {
  return (
    <div className="color-picker">
      {colors.map(c => (
        <button
          key={c}
          type="button"
          className={`color-dot ${value === c ? 'color-dot-active' : ''}`}
          style={{ background: c }}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  );
}
