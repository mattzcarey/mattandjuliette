import { createFileRoute } from "@tanstack/react-router";
import { HousePage } from "./house";

export const Route = createFileRoute("/")({
  component: HousePage,
});
