import { useState } from "react";

export default function PasswordInput({
  value,
  onChange,
  placeholder,
  name,
  autoComplete,
  disabled,
  inputProps,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="pw-wrap">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        name={name}
        autoComplete={autoComplete}
        disabled={disabled}
        {...inputProps}
      />

      <button
        type="button"
        className="pw-toggle"
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? "Sakrij lozinku" : "Prikaži lozinku"}
      >
        {visible ? "Sakrij" : "Prikaži"}
      </button>
    </div>
  );
}
