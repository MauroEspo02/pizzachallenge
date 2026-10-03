import { Brand, TileBand } from '../components/base';
import { Island } from '../islands';
import { Document } from '../layouts/Document';

export interface LoginPageProps {
  eventName: string;
  people: Array<{ id: string; name: string }>;
  showNames: boolean;
  next: string;
}

export function LoginPage({ eventName, people, showNames, next }: LoginPageProps) {
  return (
    <Document title={`Accedi · ${eventName}`}>
      <div className="login">
        <TileBand tall />
        <img className="login__pizza" src="/img/pizza-hero.svg" alt="" width={360} height={360} />
        <header className="login__head">
          <h1>
            <Brand size="xl" />
          </h1>
          <p className="login__event">{eventName === 'Pizza Challenge' ? 'Gara di pizza napoletana tra amici' : eventName}</p>
        </header>
        <Island name="LoginPad" props={{ people, showNames, next }} className="login__pad" />
        <p className="login__foot">Niente email, niente password: solo il tuo nome e il PIN che ti ha dato l’organizzatore.</p>
      </div>
    </Document>
  );
}
