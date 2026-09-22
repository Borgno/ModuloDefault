import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

// A senha temporária só existe nesta resposta: o servidor guarda apenas o hash.
export function TemporaryPasswordDialog({
  password,
  onClose,
}: {
  password: string | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
  }

  return (
    <Dialog
      open={password !== null}
      onOpenChange={(open) => {
        if (!open) {
          setCopied(false);
          onClose();
        }
      }}
    >
      <DialogContent className="rounded-3xl p-8 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">Senha temporária</DialogTitle>
          <DialogDescription>
            Entregue à pessoa por um canal seguro. Ela não será mostrada de novo, e a troca é
            obrigatória no próximo acesso.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-lg border bg-muted p-3">
          <code
            data-testid="temporary-password"
            className="flex-1 font-mono text-lg tracking-wider"
          >
            {password}
          </code>
          <Button variant="outline" size="icon" onClick={copy} aria-label="Copiar senha">
            {copied ? <Check /> : <Copy />}
          </Button>
        </div>
        <DialogFooter>
          <Button variant="solid" onClick={onClose}>
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
