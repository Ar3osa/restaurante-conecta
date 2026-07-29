import { DISTRITOS } from "@/lib/pt";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ConcelhoSelect({
  value,
  onChange,
  placeholder = "Todos os concelhos",
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
        {incluirTodos && <SelectItem value="__todos">Todos os concelhos</SelectItem>}
        {Object.entries(DISTRITOS).map(([distrito, concelhos]) => (
          <SelectGroup key={distrito}>
            <SelectLabel>{distrito}</SelectLabel>
            {concelhos.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}