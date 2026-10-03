/** "Crea la tua pizza": nome, ingredienti scritti liberamente, creatori, panetti, descrizione. */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { buildPizzaArt } from '../../pizza-builder/art';
import { toArtIngredients } from '../../pizza-builder/art-input';
import { buildCatalogIndex, MAX_INGREDIENTS, parseIngredientText, suggestIngredients } from '../../pizza-builder/match';
import type { IngredientDef } from '../../pizza-builder/types';
import { normalizeText, joinNames } from '../../utils/text';
import { api, ApiError, errorMessage } from '../lib/api';
import { toast, toastAfterNavigation } from '../lib/toast';
import { Icon } from '../components/Icon';
import { Dialog } from './parts/Dialog';
import { PizzaPreview } from './parts/PizzaPreview';

export interface PizzaBuilderProps {
  mode: 'create' | 'edit';
  initial: {
    recipeId: string | null;
    name: string;
    description: string;
    creatorIds: string[];
    ingredients: string[];
    doughIds: string[];
    artSeed: number;
  };
  people: Array<{ id: string; name: string }>;
  doughs: Array<{ id: string; name: string; shortName: string; tone: string }>;
  catalog: IngredientDef[];
  popular: string[];
  lockedCreatorId: string | null;
  isAdmin: boolean;
  saveUrl: string;
  deleteUrl: string | null;
  doneHref: string;
}

interface Item {
  label: string;
  ingredientId: string | null;
}

const SEPARATOR = /[,;\n+]|\s(?:e|ed|con)\s(?=\S)/i;

export default function PizzaBuilder(props: PizzaBuilderProps) {
  const { initial, people, doughs, catalog, lockedCreatorId, isAdmin } = props;
  const index = useMemo(() => buildCatalogIndex(catalog), [catalog]);
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [creatorIds, setCreatorIds] = useState<string[]>(initial.creatorIds);
  const [doughIds, setDoughIds] = useState<string[]>(initial.doughIds);
  const [items, setItems] = useState<Item[]>(() => initial.ingredients.map((label) => ({ label, ingredientId: parseIngredientText(label, index)[0]?.ingredientId ?? null })));
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmLoss, setConfirmLoss] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [stageVisible, setStageVisible] = useState(true);

  // Quando l'anteprima grande esce dallo schermo (tastiera aperta), ne compare una piccola in alto.
  useEffect(() => {
    const el = previewRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setStageVisible(!!entry && entry.intersectionRatio > 0.25), { threshold: [0, 0.25, 0.5] });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const draftItems = useMemo(() => (draft.trim() ? parseIngredientText(draft, index) : []), [draft, index]);
  const previewItems = useMemo(() => {
    const seen = new Set(items.map((i) => i.ingredientId ?? `x:${normalizeText(i.label)}`));
    return [...items, ...draftItems.filter((d) => !seen.has(d.ingredientId ?? `x:${normalizeText(d.label)}`))];
  }, [items, draftItems]);
  const art = useMemo(
    () =>
      buildPizzaArt(
        initial.artSeed,
        toArtIngredients(previewItems.map((i) => ({ label: i.label, def: i.ingredientId ? index.byId.get(i.ingredientId) ?? null : null }))),
        'builder',
      ),
    [previewItems, index, initial.artSeed],
  );

  const takenIds = useMemo(() => new Set(items.map((i) => i.ingredientId).filter((x): x is string => !!x)), [items]);
  const suggestions = useMemo(() => {
    const lastPart = draft.split(SEPARATOR).pop() ?? '';
    return lastPart.trim().length >= 2 ? suggestIngredients(lastPart, index, takenIds, 5) : [];
  }, [draft, index, takenIds]);
  const quickPicks = useMemo(
    () => props.popular.map((id) => index.byId.get(id)).filter((d): d is IngredientDef => !!d && !takenIds.has(d.id)).slice(0, 10),
    [props.popular, index, takenIds],
  );
  const unknown = items.filter((i) => !i.ingredientId);

  function addItems(newItems: Item[]) {
    if (!newItems.length) return;
    setItems((current) => {
      const out = [...current];
      for (const item of newItems) {
        if (out.length >= MAX_INGREDIENTS) break;
        const dup = out.some((o) => (item.ingredientId ? o.ingredientId === item.ingredientId : normalizeText(o.label) === normalizeText(item.label)));
        if (!dup) out.push(item);
      }
      return out;
    });
  }

  function commit(text: string) {
    addItems(parseIngredientText(text, index));
  }

  function onDraftChange(value: string) {
    const parts = value.split(SEPARATOR);
    if (parts.length > 1) {
      const rest = parts.pop() ?? '';
      commit(parts.join(', '));
      setDraft(rest.trimStart());
    } else setDraft(value);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit(draft);
      setDraft('');
    } else if (e.key === 'Backspace' && draft === '' && items.length) {
      setItems((current) => current.slice(0, -1));
    }
  }

  function addDef(def: IngredientDef) {
    addItems([{ label: def.name, ingredientId: def.id }]);
    setDraft('');
    inputRef.current?.focus();
  }

  function toggle(list: string[], id: string, setter: (v: string[]) => void) {
    setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  const allItems = [...items, ...draftItems];
  const canSave = name.trim().length > 0 && allItems.length > 0 && creatorIds.length > 0 && !saving;

  async function save(confirmVoteLoss = false) {
    const finalItems = [...items];
    for (const d of draftItems) if (!finalItems.some((i) => normalizeText(i.label) === normalizeText(d.label))) finalItems.push(d);
    setItems(finalItems);
    setDraft('');
    setSaving(true);
    try {
      await api(props.saveUrl, {
        recipeId: initial.recipeId,
        name,
        description,
        creatorIds,
        ingredients: finalItems.map((i) => i.label),
        doughIds,
        artSeed: initial.artSeed,
        confirmVoteLoss,
      });
      toastAfterNavigation(props.mode === 'create' ? `“${name.trim()}” è in carta!` : 'Pizza aggiornata', 'ok');
      window.location.href = props.doneHref;
    } catch (error) {
      setSaving(false);
      if (error instanceof ApiError && error.code === 'VOTES_WOULD_BE_LOST') {
        setConfirmLoss(Number(error.data?.votes ?? 0));
        return;
      }
      toast(errorMessage(error), 'error');
    }
  }

  async function remove() {
    if (!props.deleteUrl) return;
    setSaving(true);
    try {
      await api(props.deleteUrl, {});
      toastAfterNavigation('Pizza eliminata', 'ok');
      window.location.href = props.doneHref;
    } catch (error) {
      setSaving(false);
      setConfirmDelete(false);
      toast(errorMessage(error), 'error');
    }
  }

  const creatorNames = people.filter((p) => creatorIds.includes(p.id)).map((p) => p.name);

  return (
    <div className="builder">
      <div className="builder__stage" ref={previewRef}>
        <div className="peel" aria-hidden="true" />
        <div className="builder__pizza">
          <PizzaPreview art={art} title={name.trim() ? `Anteprima di ${name.trim()}` : 'Anteprima della pizza'} />
        </div>
        <div className="tag">
          <span className="tag__name">{name.trim() || 'La tua pizza'}</span>
          <span className="tag__by">{creatorNames.length ? `di ${joinNames(creatorNames)}` : 'Scegli chi la firma'}</span>
        </div>
      </div>

      <div className={`mini-preview${stageVisible ? '' : ' is-visible'}`} aria-hidden="true">
        <PizzaPreview art={art} title="" idPrefix="mini" />
      </div>

      <div className="builder__form">
        <label className="field">
          <span className="field__label">Nome della pizza</span>
          <input className="input input--big" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Es. Zucca e funghi" autoCapitalize="sentences" />
        </label>

        <div className="field">
          <label className="field__label" htmlFor="ing-input">
            Ingredienti
          </label>
          <div className="taginput" onClick={() => inputRef.current?.focus()}>
            {items.map((item, i) => (
              <span key={`${item.label}-${i}`} className={`tag-chip${item.ingredientId ? '' : ' tag-chip--unknown'}`}>
                {item.ingredientId ? null : <span className="tag-chip__q" aria-hidden="true">?</span>}
                {item.label}
                <button
                  type="button"
                  aria-label={`Togli ${item.label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setItems((current) => current.filter((_, j) => j !== i));
                  }}
                >
                  <Icon name="x" size={14} />
                </button>
              </span>
            ))}
            <input
              id="ing-input"
              ref={inputRef}
              className="taginput__input"
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={onKeyDown}
              onBlur={() => {
                if (draft.trim()) {
                  commit(draft);
                  setDraft('');
                }
              }}
              placeholder={items.length ? 'Aggiungi…' : 'es. crema di zucca, porcini, fior di latte'}
              autoComplete="off"
              autoCapitalize="none"
              enterKeyHint="done"
            />
          </div>
          <div className="suggest" aria-live="polite">
            {(suggestions.length ? suggestions : draft.trim() ? [] : quickPicks).map((def) => (
              <button
                key={def.id}
                type="button"
                className="suggest__item"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addDef(def)}
              >
                <Icon name="plus" size={14} /> {def.name}
              </button>
            ))}
          </div>
          <p className="field__hint">
            Scrivi liberamente: le virgole e la “e” separano gli ingredienti. La pizza si compone mentre scrivi.
          </p>
          {unknown.length ? (
            <p className="field__note">
              {joinNames(unknown.map((u) => `“${u.label}”`))} non {unknown.length === 1 ? 'ha' : 'hanno'} ancora un disegno: {unknown.length === 1 ? 'compare' : 'compaiono'} come ingrediente generico. Va bene così, l’admin può aggiungerlo dopo.
            </p>
          ) : null}
        </div>

        <fieldset className="field">
          <legend className="field__label">Chi la firma</legend>
          <div className="pick">
            {people.map((p) => {
              const on = creatorIds.includes(p.id);
              const locked = p.id === lockedCreatorId;
              return (
                <button key={p.id} type="button" className={`pick__item${on ? ' is-on' : ''}`} aria-pressed={on} disabled={locked} onClick={() => toggle(creatorIds, p.id, setCreatorIds)}>
                  {on ? <Icon name="check" size={16} /> : null}
                  {p.name}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend className="field__label">Con quali panetti</legend>
          <div className="doughs">
            {doughs.map((d) => {
              const on = doughIds.includes(d.id);
              return (
                <button key={d.id} type="button" className={`dough-pick dough-pick--${d.tone}${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => toggle(doughIds, d.id, setDoughIds)}>
                  <span className="dough-pick__check">{on ? <Icon name="check" size={16} /> : null}</span>
                  <span>{d.name}</span>
                </button>
              );
            })}
          </div>
          <p className="field__hint">
            {doughIds.length === 0
              ? 'Nessun panetto scelto: verrà creata una sola pizza, il panetto si assegna dopo.'
              : doughIds.length === 1
                ? 'Una sola pizza da votare.'
                : `${doughIds.length} pizze da votare: stesso gusto, panetti diversi.`}
          </p>
        </fieldset>

        <label className="field">
          <span className="field__label">
            Descrizione <span className="field__optional">facoltativa</span>
          </span>
          <textarea className="input textarea" value={description} maxLength={280} rows={2} onChange={(e) => setDescription(e.target.value)} placeholder="Una riga per raccontarla" />
        </label>

        <div className="savebar">
          <button type="button" className="btn btn--primary btn--block btn--big" disabled={!canSave} onClick={() => save(false)}>
            {saving ? <span className="spinner spinner--light" /> : <Icon name="peel" size={22} />}
            <span>{props.mode === 'create' ? 'Inforna la pizza' : 'Salva le modifiche'}</span>
          </button>
          {props.deleteUrl ? (
            <button type="button" className="btn btn--ghost btn--danger-text btn--block" onClick={() => setConfirmDelete(true)} disabled={saving}>
              <Icon name="trash" size={20} /> <span>Elimina questa pizza</span>
            </button>
          ) : null}
        </div>
      </div>

      <Dialog
        open={confirmLoss !== null}
        title="Si perdono dei voti"
        tone="danger"
        onClose={() => setConfirmLoss(null)}
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => setConfirmLoss(null)}>
              Annulla
            </button>
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => {
                setConfirmLoss(null);
                void save(true);
              }}
            >
              Togli il panetto e i voti
            </button>
          </>
        }
      >
        <p>Togliendo quel panetto viene eliminata la sua pizza insieme a {confirmLoss} {confirmLoss === 1 ? 'voto' : 'voti'}.</p>
      </Dialog>

      <Dialog
        open={confirmDelete}
        title="Eliminare la pizza?"
        tone="danger"
        onClose={() => setConfirmDelete(false)}
        footer={
          <>
            <button type="button" className="btn btn--secondary" onClick={() => setConfirmDelete(false)}>
              Annulla
            </button>
            <button type="button" className="btn btn--danger" onClick={remove}>
              Elimina
            </button>
          </>
        }
      >
        <p>
          “{name || initial.name}” verrà tolta dalla serata{isAdmin ? ', con tutte le sue versioni e i loro voti' : ''}.
        </p>
      </Dialog>
    </div>
  );
}
