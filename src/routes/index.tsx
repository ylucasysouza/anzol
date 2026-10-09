import { createFileRoute } from "@tanstack/react-router";
import { TradingProApp } from "@/components/tcp/trading-pro-app";

export const Route = createFileRoute("/")({ component: TradingProApp });
