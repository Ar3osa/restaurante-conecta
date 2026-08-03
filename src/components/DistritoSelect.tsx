import { DISTRITOS } from "@/lib/pt";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DistritoSelect({
  value,
  onChange,
  placeholder = "Todos os distritos",
  incluirTodos = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  incluirTodos?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {incluirTodos && <SelectItem value="__todos">Todos os distritos</SelectItem>}
        {Object.keys(DISTRITOS).map((d) => (
          <SelectItem key={d} value={d}>
            {d}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
