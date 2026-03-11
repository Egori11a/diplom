import "./hero-organism.css";
import type { HeroOrganismProps } from "./types";

export const HeroOrganism = ({ title, subtitle }: HeroOrganismProps) => {
  return (
    <header className="hero-organism">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  );
};
