/** Libreria ingredienti (admin): ingredienti senza grafica, ricerca, creazione e modifica con anteprima. */
import { useMemo, useState } from 'react';
import { buildPizzaArt } from '../../pizza-builder/art';
import type { IngredientDef } from '../../pizza-builder/types';
import { normalizeText } from '../../utils/text';
import { api, errorMessage } from '../lib/api';
import { toast, toastAfterNavigation } from '../lib/toast';
import { Icon } from '../components/Icon';
import { Dialog } from './parts/Dialog';
import { PizzaPreview } from './parts/PizzaPreview';

export interface IngredientsManagerProps {
  catalog: Array<IngredientDef & { isBuiltin: boolean; uses: number }>;
  unmatched: Array<{ label: string; pizzas: number }>;
  visuals: Array<{ key: string; label: string; defaultColors: string[] }>;
  categories: Array<{ key: string; label: string }>;
  layers: Array<{ key: string; label: string }>;
}

interface Form {
  id: string | null;
  name: string;
  aliases: string;
  category: string;
  visual: string;
  layer: string;
  density: number;
  color1: string;
  color2: string;
}

const EMPTY: Form = { id: null, name: '', aliases: '', category: 'altro', visual: 'generic', layer: 'topping', density: 1, color1: '#B5835A', color2: '#8E6B3E' };

export default function IngredientsManager({ catalog, unmatched, visuals, categories, layers }: IngredientsManagerProps) {
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const filtered = useMemo(() => {
    const q = normalizeText(query);
    if (!q) return catalog;
    return catalog.filter((i) => normalizeText(`${i.name} ${i.aliases.join(' ')}`).includes(q));
  }, [catalog, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const i of filtered) map.set(i.category, [...(map.get(i.category) ?? []), i]);
    return categories.filter((c) => map.has(c.key)).map((c) => ({ ...c, items: map.get(c.key)! }));
  }, [filtered, categories]);

  const preview = useMemo(() => {
    if (!form) return null;
    const key = 'anteprima';
    const isSauce = form.visual === 'sauce';
    return buildPizzaArt(
      4242,
      [
        ...(isSauce ? [] : [{ key: 'base', visual: 'sauce', layer: 'sauce' as const, density: 1, colors: ['#C2381F'] }]),
        { key, visual: form.visual, layer: (form.layer as IngredientDef['layer']) ?? 'topping', density: form.density, colors: [form.color1, form.color2] },
      ],
      'ingr',
    );
  }, [form]);

  function edit(def: IngredientDef) {
    setForm({
      id: def.id,
      name: def.name,
      aliases: def.aliases.join(', '),
      category: def.category,
      visual: def.visual,
      layer: def.layer,
      density: def.density,
      color1: def.colors[0] ?? '#B5835A',
      color2: def.colors[1] ?? def.colors[0] ?? '#8E6B3E',
    });
  }

  function createFrom(label: string) {
    setForm({ ...EMPTY, name: label.charAt(0).toUpperCase() + label.slice(1), aliases: label.toLowerCase() });
  }

  async function save() {
    if (!form) return;
    setBusy(true);
    try {
      const data = await api<{ relinked: number }>('/api/admin/ingredients', {
        id: form.id,
        name: form.name,
        aliases: form.aliases.split(',').map((a) => a.trim()).filter(Boolean),
        category: form.category,
        visual: form.visual,
        layer: form.layer,
        density: form.density,
        colors: [form.color1, form.color2],
      });
      toastAfterNavigation(data.relinked ? `Salvato: ${data.relinked} pizze ora lo disegnano` : 'Ingrediente salvato', 'ok');
      window.location.reload();
    } catch (error) {
      setBusy(false);
      toast(errorMessage(error), 'error');
    }
  }

  async function remove() {
    if (!form?.id) return;
    setBusy(true);
    try {
      await api(`/api/admin/ingredients/${form.id}/delete`, {});
      toastAfterNavigation('Ingrediente eliminato', 'ok');
      window.location.reload();
    } catch (error) {
      setBusy(false);
      toast(errorMessage(error), 'error');
    }
  }

  return (
    <div className="ingr">
      {unmatched.length ? (
        <section className="card card--warn">
          <h2 className="card__title">Senza grafica</h2>
          <p className="card__text">Questi ingredienti compaiono nelle pizze ma non hanno ancora un disegno: per ora sono generici.</p>
          <ul className="ingr__unmatched">
            {unmatched.map((u) => (
              <li key={u.label}>
                <span>
                  <strong>{u.label}</strong> <small>in {u.pizzas} {u.pizzas === 1 ? 'pizza' : 'pizze'}</small>
                </span>
                <button type="button" className="btn btn--small btn--primary" onClick={() => createFrom(u.label)}>
                  <Icon name="plus" size={16} /> <span>Crea</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="ingr__tools">
        <input className="input" type="search" placeholder="Cerca tra gli ingredienti" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button type="button" className="btn btn--primary" onClick={() => setForm({ ...EMPTY })}>
          <Icon name="plus" size={20} /> <span>Nuovo</span>
        </button>
      </div>

      {grouped.map((group) => (
        <section key={group.key} className="ingr__group">
          <h2 className="ingr__cat">{group.label}</h2>
          <ul className="ingr__list">
            {group.items.map((i) => (
              <li key={i.id}>
                <button type="button" className="ingr__item" onClick={() => edit(i)}>
                  <span className="swatch" aria-hidden="true">
                    {i.colors.slice(0, 2).map((c) => (
                      <span key={c} style={{ background: c }} />
                    ))}
                  </span>
                  <span className="ingr__name">{i.name}</span>
                  <span className="ingr__meta">{visuals.find((v) => v.key === i.visual)?.label ?? i.visual}</span>
                  {i.uses ? <span className="pill pill--ok">{i.uses}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <Dialog
        open={!!form}
        wide
        title={form?.id ? `Modifica: ${form.name}` : 'Nuovo ingrediente'}
        onClose={() => {
          setForm(null);
          setConfirmDelete(false);
        }}
        footer={
          <>
            {form?.id && !confirmDelete ? (
              <button type="button" className="btn btn--ghost btn--danger-text" onClick={() => setConfirmDelete(true)}>
                <Icon name="trash" size={18} /> <span>Elimina</span>
              </button>
            ) : null}
            {confirmDelete ? (
              <button type="button" className="btn btn--danger" disabled={busy} onClick={remove}>
                Sì, elimina
              </button>
            ) : null}
            <button type="button" className="btn btn--primary" disabled={busy || !form?.name.trim()} onClick={save}>
              Salva
            </button>
          </>
        }
      >
        {form && preview ? (
          <div className="ingr-edit">
            <div className="ingr-edit__preview">
              <PizzaPreview art={preview} title={`Anteprima di ${form.name || 'ingrediente'}`} />
            </div>
            <div className="ingr-edit__fields">
              <label className="field">
                <span className="field__label">Nome</span>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={40} />
              </label>
              <label className="field">
                <span className="field__label">Altri modi di scriverlo</span>
                <textarea className="input textarea" rows={2} value={form.aliases} onChange={(e) => setForm({ ...form, aliases: e.target.value })} placeholder="separati da virgola: lampascioni, cipolla canina" />
              </label>
              <div className="ingr-edit__row">
                <label className="field">
                  <span className="field__label">Aspetto</span>
                  <select
                    className="select"
                    value={form.visual}
                    onChange={(e) => {
                      const v = visuals.find((x) => x.key === e.target.value);
                      setForm({ ...form, visual: e.target.value, ...(form.id ? {} : { color1: v?.defaultColors[0] ?? form.color1, color2: v?.defaultColors[1] ?? form.color2 }), ...(e.target.value === 'sauce' ? { layer: 'sauce' } : {}) });
                    }}
                  >
                    {visuals.map((v) => (
                      <option key={v.key} value={v.key}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field__label">Categoria</span>
                  <select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {categories.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="ingr-edit__row">
                <label className="field">
                  <span className="field__label">Livello</span>
                  <select className="select" value={form.layer} onChange={(e) => setForm({ ...form, layer: e.target.value })}>
                    {layers.map((l) => (
                      <option key={l.key} value={l.key}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field__label">Quantità: {form.density.toFixed(1)}×</span>
                  <input type="range" min={0.4} max={2} step={0.1} value={form.density} onChange={(e) => setForm({ ...form, density: Number(e.target.value) })} />
                </label>
              </div>
              <div className="ingr-edit__row">
                <label className="field color-field">
                  <span className="field__label">Colore principale</span>
                  <input type="color" value={form.color1} onChange={(e) => setForm({ ...form, color1: e.target.value })} />
                </label>
                <label className="field color-field">
                  <span className="field__label">Colore secondario</span>
                  <input type="color" value={form.color2} onChange={(e) => setForm({ ...form, color2: e.target.value })} />
                </label>
              </div>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
