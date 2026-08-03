import { useState } from "react";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  /** Rótulo de quem está a ser avaliado, ex.: "esta casa" / "este trabalhador". */
  avaliadoLabel: string;
  confirmadoProprio: boolean;
  confirmadoOutro: boolean;
  avaliacaoEnviada: number | null;
  onConfirmar: () => void;
  confirmando: boolean;
  onAvaliar: (estrelas: number, comentario: string) => void;
  avaliando: boolean;
}

export function AvaliacaoTurno({
  avaliadoLabel,
  confirmadoProprio,
  confirmadoOutro,
  avaliacaoEnviada,
  onConfirmar,
  confirmando,
  onAvaliar,
  avaliando,
}: Props) {
  const [estrelas, setEstrelas] = useState(0);
  const [comentario, setComentario] = useState("");

  if (avaliacaoEnviada != null) {
    return (
      <p className="text-sm text-muted-foreground">
        Avaliaste {avaliadoLabel}: <StarRating value={avaliacaoEnviada} size="sm" label="Avaliação enviada" />
      </p>
    );
  }

  if (confirmadoProprio && confirmadoOutro) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">Como avalias {avaliadoLabel}?</p>
        <StarRating value={estrelas} onChange={setEstrelas} label="Classificação" />
        <Textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          maxLength={300}
          rows={2}
          placeholder="Comentário opcional"
        />
        <Button
          size="sm"
          disabled={estrelas === 0 || avaliando}
          onClick={() => onAvaliar(estrelas, comentario)}
        >
          Enviar avaliação
        </Button>
      </div>
    );
  }

  if (confirmadoProprio) {
    return <p className="text-sm text-muted-foreground">À espera que a outra parte confirme o turno.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Já foi feito este turno?</p>
      <Button size="sm" variant="outline" onClick={onConfirmar} disabled={confirmando}>
        Confirmar turno realizado
      </Button>
    </div>
  );
}
