import { Team } from "@/data/Teams";

export function CountryFlag({ homeTeam, className }: { homeTeam: Team; className?: string }) {
    return <img
        src={`https://flagcdn.com/w40/${homeTeam.iso2.toLowerCase()}.png`}
        alt={homeTeam.nameEs}
        className={className ?? "h-5 w-7 shrink-0 rounded-sm object-cover shadow-sm"}
    />
}