import { useQuery } from "@tanstack/react-query";
import { Check, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useDebouncedValue } from "~/hooks/useDebouncedValue";
import { ApiError } from "~/lib/api";
import { contactsQuery, useCreateConversation } from "~/lib/chat/chat.queries";
import { cn } from "~/lib/utils";
import type { Conversation } from "~/types/chat";
import { Avatar } from "./Avatar";

// Nova conversa: com uma pessoa (abre a que já existe) ou um grupo com nome.
export function NewConversationDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (conversation: Conversation) => void;
}) {
  const [mode, setMode] = useState<"direct" | "group">("direct");
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const debounced = useDebouncedValue(search.trim(), 300);
  const contacts = useQuery({ ...contactsQuery(debounced), enabled: open });
  const create = useCreateConversation();

  function reset(next: boolean) {
    if (!next) {
      setMode("direct");
      setSearch("");
      setName("");
      setSelected([]);
      create.reset();
    }
    onOpenChange(next);
  }

  function done(conversation: Conversation) {
    onCreated(conversation);
    reset(false);
  }

  const error = create.error instanceof ApiError ? create.error.message : null;

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl p-8 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">Nova conversa</DialogTitle>
          <DialogDescription>
            {mode === "direct" ? "Escolha com quem conversar." : "Dê um nome e escolha as pessoas."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2" role="group" aria-label="Tipo de conversa">
          <Button
            type="button"
            variant={mode === "direct" ? "default" : "outline"}
            size="sm"
            aria-pressed={mode === "direct"}
            onClick={() => setMode("direct")}
          >
            Pessoa
          </Button>
          <Button
            type="button"
            variant={mode === "group" ? "default" : "outline"}
            size="sm"
            aria-pressed={mode === "group"}
            onClick={() => setMode("group")}
          >
            <Users />
            Grupo
          </Button>
        </div>

        {mode === "group" && (
          <div className="space-y-1.5">
            <Label htmlFor="nome-grupo">Nome do grupo</Label>
            <Input
              id="nome-grupo"
              value={name}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="buscar-pessoa">Buscar pessoa</Label>
          <Input
            id="buscar-pessoa"
            placeholder="Nome ou e-mail"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <ul aria-label="Pessoas" className="max-h-64 divide-y overflow-y-auto rounded-xl border">
          {contacts.data?.data.length === 0 && (
            <li className="px-4 py-6 text-center font-inter text-xs text-muted-foreground">
              Ninguém encontrado.
            </li>
          )}
          {contacts.data?.data.map((person) => {
            const checked = selected.includes(person.id);
            return (
              <li key={person.id}>
                <button
                  type="button"
                  aria-pressed={mode === "group" ? checked : undefined}
                  disabled={create.isPending}
                  onClick={() => {
                    if (mode === "direct") {
                      create.mutate({ kind: "direct", memberId: person.id }, { onSuccess: done });
                    } else {
                      setSelected((ids) =>
                        checked ? ids.filter((id) => id !== person.id) : [...ids, person.id],
                      );
                    }
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/60",
                    checked && "bg-primary/5",
                  )}
                >
                  <Avatar name={person.fullName} className="size-8" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{person.fullName}</span>
                    <span className="block truncate font-inter text-xs text-muted-foreground">
                      {person.email}
                    </span>
                  </span>
                  {checked && <Check size={16} className="text-primary" />}
                </button>
              </li>
            );
          })}
        </ul>

        {error && <p className="font-inter text-xs text-destructive">{error}</p>}

        {mode === "group" && (
          <Button
            disabled={!name.trim() || selected.length === 0 || create.isPending}
            onClick={() =>
              create.mutate(
                { kind: "group", name: name.trim(), memberIds: selected },
                { onSuccess: done },
              )
            }
          >
            Criar grupo
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
