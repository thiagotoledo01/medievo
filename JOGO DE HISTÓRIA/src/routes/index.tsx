import { createFileRoute } from "@tanstack/react-router";
import MedievoApp from "@/game/App";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Medievo — Tabuleiro da Idade Média online" },
      { name: "description", content: "Jogo de tabuleiro com perguntas sobre a Idade Média. Crie uma sala, mande o código e jogue online no celular ou no computador." },
      { property: "og:title", content: "Medievo — Tabuleiro da Idade Média" },
      { property: "og:description", content: "Crie uma sala, mande o código e jogue online com os amigos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MedievoApp,
});
