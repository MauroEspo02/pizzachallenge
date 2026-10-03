/**
 * Elenco delle isole interattive. Il server le renderizza in HTML, il browser le "idrata".
 * Aggiungendo un'isola: importala qui E in src/client/islands.ts (un test controlla che coincidano).
 */
import { createElement, type ComponentProps, type ComponentType } from 'react';
import AccountMenu from './AccountMenu';
import AdminAction from './AdminAction';
import IngredientsManager from './IngredientsManager';
import LiveSync from './LiveSync';
import LoginPad from './LoginPad';
import ParticipantsManager from './ParticipantsManager';
import PizzaBuilder from './PizzaBuilder';
import PizzasManager from './PizzasManager';
import ResetPanel from './ResetPanel';
import RevealShow from './RevealShow';
import SettingsForm from './SettingsForm';
import ShareLink from './ShareLink';
import VoteForm from './VoteForm';
import VotesBoard from './VotesBoard';

export const ISLANDS = {
  AccountMenu,
  AdminAction,
  IngredientsManager,
  LiveSync,
  LoginPad,
  ParticipantsManager,
  PizzaBuilder,
  PizzasManager,
  ResetPanel,
  RevealShow,
  SettingsForm,
  ShareLink,
  VoteForm,
  VotesBoard,
};

export type IslandName = keyof typeof ISLANDS;
export type IslandProps<N extends IslandName> = ComponentProps<(typeof ISLANDS)[N]>;

export function Island<N extends IslandName>({ name, props, className }: { name: N; props: IslandProps<N>; className?: string }) {
  const Component = ISLANDS[name] as unknown as ComponentType<Record<string, unknown>>;
  return (
    <div className={className ? `island ${className}` : 'island'} data-island={name} data-props={JSON.stringify(props)}>
      {createElement(Component, props as unknown as Record<string, unknown>)}
    </div>
  );
}
