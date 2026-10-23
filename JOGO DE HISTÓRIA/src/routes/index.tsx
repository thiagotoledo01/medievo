import { createFileRoute, redirect } from "@tanstack/react-router";

// The game itself is plain HTML/CSS/JS in public/index.html.
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Medievo — Jogo de tabuleiro da Idade Média" },
      { name: "description", content: "Jogo de tabuleiro com perguntas sobre a Idade Média, local ou online." },
      { property: "og:title", content: "Medievo" },
      { property: "og:description", content: "Jogo de tabuleiro com perguntas sobre a Idade Média, local ou online." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: ({ location }) => {
    throw redirect({ href: "/index.html" + (location.searchStr || "") });
  },
});
