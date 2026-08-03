// Dados e etiquetas em português de Portugal usados por toda a aplicação.

export const DISTRITOS: Record<string, string[]> = {
  Aveiro: [
    "Aveiro",
    "Águeda",
    "Albergaria-a-Velha",
    "Anadia",
    "Espinho",
    "Ílhavo",
    "Oliveira de Azeméis",
    "Ovar",
    "Santa Maria da Feira",
    "São João da Madeira",
  ],
  Beja: ["Beja", "Moura", "Odemira", "Serpa"],
  Braga: [
    "Braga",
    "Barcelos",
    "Esposende",
    "Fafe",
    "Guimarães",
    "Vila Nova de Famalicão",
    "Vizela",
  ],
  Bragança: ["Bragança", "Mirandela", "Macedo de Cavaleiros"],
  "Castelo Branco": ["Castelo Branco", "Covilhã", "Fundão"],
  Coimbra: ["Coimbra", "Cantanhede", "Figueira da Foz", "Lousã", "Montemor-o-Velho"],
  Évora: ["Évora", "Estremoz", "Montemor-o-Novo", "Reguengos de Monsaraz"],
  Faro: [
    "Faro",
    "Albufeira",
    "Portimão",
    "Lagos",
    "Loulé",
    "Olhão",
    "Tavira",
    "Silves",
    "Vila Real de Santo António",
    "Lagoa",
    "Castro Marim",
  ],
  Guarda: ["Guarda", "Seia", "Gouveia"],
  Leiria: ["Leiria", "Alcobaça", "Caldas da Rainha", "Marinha Grande", "Nazaré", "Peniche", "Óbidos"],
  Lisboa: [
    "Lisboa",
    "Amadora",
    "Cascais",
    "Loures",
    "Mafra",
    "Odivelas",
    "Oeiras",
    "Sintra",
    "Torres Vedras",
    "Vila Franca de Xira",
  ],
  Portalegre: ["Portalegre", "Elvas", "Ponte de Sor"],
  Porto: [
    "Porto",
    "Gaia (Vila Nova de Gaia)",
    "Matosinhos",
    "Maia",
    "Gondomar",
    "Valongo",
    "Póvoa de Varzim",
    "Vila do Conde",
    "Paredes",
    "Penafiel",
    "Santo Tirso",
    "Trofa",
  ],
  Santarém: ["Santarém", "Abrantes", "Entroncamento", "Ourém", "Tomar", "Torres Novas"],
  Setúbal: [
    "Setúbal",
    "Almada",
    "Barreiro",
    "Moita",
    "Montijo",
    "Palmela",
    "Seixal",
    "Sesimbra",
    "Grândola",
    "Santiago do Cacém",
  ],
  "Viana do Castelo": ["Viana do Castelo", "Ponte de Lima", "Caminha", "Valença"],
  "Vila Real": ["Vila Real", "Chaves", "Peso da Régua"],
  Viseu: ["Viseu", "Lamego", "Mangualde", "Tondela", "São Pedro do Sul"],
  "Açores": ["Ponta Delgada", "Angra do Heroísmo", "Horta", "Praia da Vitória"],
  Madeira: ["Funchal", "Câmara de Lobos", "Machico", "Santa Cruz"],
};

export const CONCELHOS: string[] = Object.values(DISTRITOS).flat().sort((a, b) =>
  a.localeCompare(b, "pt"),
);

export type Funcao = "bartender" | "servico_mesa" | "backoffice";

export const FUNCOES: { value: Funcao; label: string; descricao: string }[] = [
  { value: "bartender", label: "Bartender", descricao: "Bar, cocktails, serviço de bebidas" },
  { value: "servico_mesa", label: "Serviço à mesa", descricao: "Sala, atendimento, empratamento" },
  { value: "backoffice", label: "Backoffice", descricao: "Copa, cozinha de apoio, stocks, caixa" },
];

export const FUNCAO_LABEL: Record<Funcao, string> = {
  bartender: "Bartender",
  servico_mesa: "Serviço à mesa",
  backoffice: "Backoffice",
};

export const TIPOS_NEGOCIO = [
  { value: "restaurante", label: "Restaurante" },
  { value: "bar", label: "Bar" },
  { value: "cafe", label: "Café / Pastelaria" },
  { value: "hotel", label: "Hotel" },
  { value: "catering", label: "Catering / Eventos" },
  { value: "outro", label: "Outro" },
] as const;

export const DIAS = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
] as const;

export const HORARIOS = ["Part-time", "Full-time"] as const;

/** Ids de perfis de demonstração desbloqueados para pré-visualização sem conta. */
export const DEMO_DESBLOQUEADOS = [
  "11111111-1111-4111-8111-000000000001",
  "11111111-1111-4111-8111-000000000002",
];

export function formatarData(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-PT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}