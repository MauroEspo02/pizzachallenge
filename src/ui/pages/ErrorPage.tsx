import { Brand, TileBand } from '../components/base';
import { Document } from '../layouts/Document';

export function ErrorPage({ status, message }: { status: number; message: string }) {
  const title = status === 404 ? 'Questa pagina non c’è' : status === 403 ? 'Accesso non consentito' : 'Il forno si è spento un attimo';
  return (
    <Document title={title}>
      <div className="errorpage">
        <TileBand />
        <Brand size="m" />
        <p className="errorpage__code">{status}</p>
        <h1 className="errorpage__title">{title}</h1>
        <p className="errorpage__text">{message}</p>
        <a className="btn btn--primary" href="/">
          Torna alle pizze
        </a>
      </div>
    </Document>
  );
}

export function OfflinePage() {
  return (
    <Document title="Sei offline">
      <div className="errorpage">
        <TileBand />
        <Brand size="m" />
        <h1 className="errorpage__title">Sei offline</h1>
        <p className="errorpage__text">Appena torna la connessione, ricarica la pagina: i voti si salvano solo online.</p>
        <a className="btn btn--primary" href="/">
          Riprova
        </a>
      </div>
    </Document>
  );
}
