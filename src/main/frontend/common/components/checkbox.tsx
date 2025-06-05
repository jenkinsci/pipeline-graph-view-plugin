import { useId } from "react";

export default function Checkbox({
  label,
  value,
  setValue,
}: {
  label: string;
  value: boolean;
  setValue: (e: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="jenkins-checkbox">
      <input
        type="checkbox"
        id={id}
        name={id}
        checked={value}
        onChange={(e) => setValue(e.target.checked)}
      />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}
