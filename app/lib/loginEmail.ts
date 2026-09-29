// O e-mail que o login envia: só o nome ganha o domínio da organização, e o que já tem "@" vai como
// foi digitado. A API continua recebendo um e-mail completo.
export function completeLoginEmail(value: string, domain: string | null) {
  const email = value.trim();
  if (!domain || email === "" || email.includes("@")) return email;
  return `${email}@${domain}`;
}
