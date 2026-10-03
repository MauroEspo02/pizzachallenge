/** Caricamento pigro delle isole: il browser scarica solo il codice delle isole presenti nella pagina. */
import type { ComponentType } from 'react';

type IslandModule = { default: ComponentType<Record<string, unknown>> };
const as = (p: Promise<{ default: unknown }>) => p as Promise<IslandModule>;

export const ISLAND_LOADERS: Record<string, () => Promise<IslandModule>> = {
  AccountMenu: () => as(import('../ui/islands/AccountMenu')),
  AdminAction: () => as(import('../ui/islands/AdminAction')),
  IngredientsManager: () => as(import('../ui/islands/IngredientsManager')),
  LiveSync: () => as(import('../ui/islands/LiveSync')),
  LoginPad: () => as(import('../ui/islands/LoginPad')),
  ParticipantsManager: () => as(import('../ui/islands/ParticipantsManager')),
  PizzaBuilder: () => as(import('../ui/islands/PizzaBuilder')),
  PizzasManager: () => as(import('../ui/islands/PizzasManager')),
  ResetPanel: () => as(import('../ui/islands/ResetPanel')),
  RevealShow: () => as(import('../ui/islands/RevealShow')),
  SettingsForm: () => as(import('../ui/islands/SettingsForm')),
  ShareLink: () => as(import('../ui/islands/ShareLink')),
  VoteForm: () => as(import('../ui/islands/VoteForm')),
  VotesBoard: () => as(import('../ui/islands/VotesBoard')),
};
