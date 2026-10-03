/**
 * Il verdetto, una scena alla volta: panetti → premi → miglior gusto → podio (3°, 2°, 1°).
 * Tocca a destra per andare avanti, a sinistra per tornare indietro.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatScore, ordinal } from '../../utils/format';
import { Icon } from '../components/Icon';
import { Confetti } from './parts/Confetti';
import { CountUp } from './parts/CountUp';

export interface RevealPizza {
  id: string;
  name: string;
  creators: string;
  dough: { name: string; short: string; tone: string } | null;
  artUrl: string;
  score: number | null;
}

function DoughPill({ dough, short = false }: { dough: RevealPizza['dough']; short?: boolean }) {
  if (!dough) return null;
  return (
    <span className={`dough dough--${dough.tone}`}>
      <span className="dough__dot" aria-hidden="true" />
      {short ? dough.short : dough.name}
    </span>
  );
}

export interface RevealShowProps {
  seenCookie: string;
  revealKey: string;
  initiallyOpen: boolean;
  doughs: Array<{ name: string; tone: string; overall: number | null; wins: number; pizzas: number }>;
  headToHeadCount: number;
  awards: Array<{ label: string; title: string; value: number | null; winners: RevealPizza[] }>;
  bestRecipes: Array<{ name: string; creators: string; artUrl: string; score: number | null; versions: Array<{ doughName: string; overall: number | null }> }>;
  podium: Array<{ position: number; tied: boolean; pizzas: RevealPizza[] }>;
  totals: { votes: number; voters: number };
}

type Slide = { kind: 'intro' } | { kind: 'doughs' } | { kind: 'awards' } | { kind: 'recipe' } | { kind: 'podium'; index: number } | { kind: 'end' };

export default function RevealShow(props: RevealShowProps) {
  const [open, setOpen] = useState(props.initiallyOpen);
  const [step, setStep] = useState(0);
  const [confetti, setConfetti] = useState(0);

  const slides = useMemo<Slide[]>(() => {
    const out: Slide[] = [{ kind: 'intro' }];
    if (props.doughs.filter((d) => d.pizzas > 0).length >= 2) out.push({ kind: 'doughs' });
    if (props.awards.some((a) => a.winners.length)) out.push({ kind: 'awards' });
    if (props.bestRecipes.length) out.push({ kind: 'recipe' });
    // Podio dal basso: terzo, secondo, primo.
    [...props.podium].reverse().forEach((_, i) => out.push({ kind: 'podium', index: props.podium.length - 1 - i }));
    out.push({ kind: 'end' });
    return out;
  }, [props.doughs, props.awards, props.bestRecipes, props.podium]);

  const current = slides[step] ?? slides[0]!;

  const close = useCallback(() => {
    setOpen(false);
    document.cookie = `${props.seenCookie}=${encodeURIComponent(props.revealKey)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    document.documentElement.classList.remove('has-overlay');
    document.getElementById('classifica')?.scrollIntoView({ behavior: 'smooth' });
  }, [props.seenCookie, props.revealKey]);

  const go = useCallback(
    (delta: number) => {
      setStep((s) => {
        const next = s + delta;
        if (next >= slides.length) {
          close();
          return s;
        }
        return Math.max(0, next);
      });
    },
    [slides.length, close],
  );

  useEffect(() => {
    if (!open) return;
    document.documentElement.classList.add('has-overlay');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') go(1);
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, go, close]);

  useEffect(() => {
    if (current.kind === 'podium' && props.podium[current.index]?.position === 1) setConfetti((n) => n + 1);
  }, [current, props.podium]);

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn--secondary replay"
        onClick={() => {
          setStep(0);
          setOpen(true);
        }}
      >
        <Icon name="flame" size={20} /> <span>Rivedi il verdetto</span>
      </button>
    );
  }

  return (
    <div className="reveal" role="dialog" aria-modal="true" aria-label="Il verdetto">
      <div className="reveal__glow" aria-hidden="true" />
      <div className="reveal__bars" aria-hidden="true">
        {slides.map((_, i) => (
          <span key={i} className={i < step ? 'is-done' : i === step ? 'is-current' : ''} />
        ))}
      </div>
      <button type="button" className="reveal__close" onClick={close} aria-label="Chiudi il verdetto">
        <Icon name="x" />
      </button>
      <button type="button" className="reveal__prev" onClick={() => go(-1)} aria-label="Indietro" />
      <button type="button" className="reveal__next" onClick={() => go(1)} aria-label="Avanti" />

      <div className="reveal__stage" key={step}>
        {current.kind === 'intro' ? (
          <div className="scene scene--intro">
            <div className="oven" aria-hidden="true">
              <span className="oven__fire" />
            </div>
            <p className="scene__kicker">{props.totals.votes} voti di {props.totals.voters} giudici</p>
            <h2 className="scene__title">È arrivato il momento del verdetto.</h2>
            <p className="scene__tap">Tocca per scoprirlo</p>
          </div>
        ) : null}

        {current.kind === 'doughs' ? (
          <div className="scene">
            <p className="scene__kicker">La sfida dei panetti</p>
            <div className="duel">
              {props.doughs
                .filter((d) => d.pizzas > 0)
                .map((d, i) => (
                  <div key={d.name} className={`duel__side duel__side--${d.tone}`} style={{ animationDelay: `${i * 220}ms` }}>
                    <span className="duel__name">{d.name}</span>
                    <span className="duel__score">
                      <CountUp value={d.overall} delay={300 + i * 220} />
                    </span>
                    <span className="duel__meta">
                      {props.headToHeadCount ? `${d.wins} ${d.wins === 1 ? 'sfida vinta' : 'sfide vinte'} su ${props.headToHeadCount}` : `${d.pizzas} pizze`}
                    </span>
                  </div>
                ))}
            </div>
            <p className="scene__note">Media delle pizze fatte con ciascun panetto. Le sfide confrontano lo stesso gusto con i due panetti.</p>
          </div>
        ) : null}

        {current.kind === 'awards' ? (
          <div className="scene">
            <p className="scene__kicker">Premi speciali</p>
            <ul className="awards">
              {props.awards.map((a, i) => (
                <li key={a.label} className="award" style={{ animationDelay: `${i * 160}ms` }}>
                  {a.winners[0] ? <img src={a.winners[0].artUrl} alt="" width={64} height={64} /> : <span />}
                  <div>
                    <span className="award__label">
                      {a.label}
                      {a.winners.length > 1 ? <span className="award__tie"> · pari merito</span> : null}
                    </span>
                    {a.winners.length ? (
                      a.winners.slice(0, 3).map((w) => (
                        <span key={w.id} className="award__who">
                          <span className="award__name">{w.name}</span>
                          <DoughPill dough={w.dough} short />
                        </span>
                      ))
                    ) : (
                      <span className="award__who">—</span>
                    )}
                    {a.winners.length > 3 ? <span className="award__more">e altre {a.winners.length - 3}</span> : null}
                    <span className="award__value">
                      {a.title} {formatScore(a.value, 1)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {current.kind === 'recipe' ? (
          <div className="scene">
            <p className="scene__kicker">Miglior gusto</p>
            {props.bestRecipes.map((r) => (
              <div key={r.name} className="scene__winner">
                <img className="scene__pizza" src={r.artUrl} alt="" width={220} height={220} />
                <h2 className="scene__title">{r.name}</h2>
                <p className="scene__by">di {r.creators}</p>
                <p className="scene__score">
                  <CountUp value={r.score} delay={500} />
                </p>
                <ul className="scene__versions">
                  {r.versions.map((v) => (
                    <li key={v.doughName}>
                      <span>{v.doughName}</span>
                      <b>{formatScore(v.overall)}</b>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}

        {current.kind === 'podium'
          ? (() => {
              const place = props.podium[current.index]!;
              const first = place.position === 1;
              return (
                <div className={`scene scene--podium${first ? ' scene--first' : ''}`}>
                  <p className="scene__place">
                    {ordinal(place.position)} posto{place.tied ? ' a pari merito' : ''}
                  </p>
                  {place.pizzas.map((p) => (
                    <div key={p.id} className={`scene__winner${place.pizzas.length > 1 ? ' scene__winner--shared' : ''}`}>
                      <img className="scene__pizza scene__pizza--out" src={p.artUrl} alt="" width={240} height={240} />
                      <h2 className="scene__title">{p.name}</h2>
                      <p className="scene__by">di {p.creators}</p>
                      <DoughPill dough={p.dough} />
                      <p className="scene__score">
                        <CountUp value={p.score} delay={700} />
                      </p>
                    </div>
                  ))}
                </div>
              );
            })()
          : null}

        {current.kind === 'end' ? (
          <div className="scene scene--end">
            <h2 className="scene__title">Grazie a tutti i pizzaioli.</h2>
            <button type="button" className="btn btn--primary btn--big" onClick={close}>
              Vedi la classifica completa
            </button>
          </div>
        ) : null}
      </div>
      <Confetti fire={confetti} />
    </div>
  );
}
