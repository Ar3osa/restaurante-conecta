// Validação do NIF português (9 dígitos com dígito de controlo).
const PREFIXOS_VALIDOS = ["1", "2", "3", "5", "6", "7", "8", "9"];

export function validarNif(nif: string): boolean {
  const limpo = (nif ?? "").replace(/\s/g, "");
  if (!/^[0-9]{9}$/.test(limpo)) return false;
  if (!PREFIXOS_VALIDOS.includes(limpo[0])) return false;

  let soma = 0;
  for (let i = 0; i < 8; i++) {
    soma += Number(limpo[i]) * (9 - i);
  }
  const resto = soma % 11;
  const controlo = resto < 2 ? 0 : 11 - resto;
  return controlo === Number(limpo[8]);
}