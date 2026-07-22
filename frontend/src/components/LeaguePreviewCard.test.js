import { fireEvent, render, screen } from "@testing-library/react";

import LeaguePreviewCard from "./LeaguePreviewCard";

test("renders the active season and closes from the dialog control", () => {
  const onClose = jest.fn();

  render(<LeaguePreviewCard season="szn4" onClose={onClose} />);

  expect(screen.getByRole("dialog", { name: /league preview/i })).toBeInTheDocument();
  expect(screen.getByText("Season 4")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /close league preview/i }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("closes with the Escape key", () => {
  const onClose = jest.fn();

  render(<LeaguePreviewCard season="szn5" onClose={onClose} />);
  fireEvent.keyDown(document, { key: "Escape" });

  expect(onClose).toHaveBeenCalledTimes(1);
});
