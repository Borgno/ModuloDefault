import { Label } from "~/components/ui/label";

type ControlProps = {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby": string | undefined;
};

type FormFieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  // Recebe as props de acessibilidade para ligar o campo ao rótulo e à mensagem de erro.
  children: (props: ControlProps) => React.ReactNode;
};

export function FormField({ id, label, error, hint, children }: FormFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-bold">
        {label}
      </Label>
      {children({ id, "aria-invalid": !!error, "aria-describedby": describedBy })}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-bold text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function FormAlert({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-lg bg-badge-destructive-bg p-3 text-xs font-bold text-badge-destructive-fg"
    >
      {children}
    </div>
  );
}
