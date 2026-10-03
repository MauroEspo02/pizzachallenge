import { Brand, Notice, TileBand } from '../../components/base';
import { Document } from '../../layouts/Document';

export function AdminLoginPage({ error, configured, devHint }: { error: string | null; configured: boolean; devHint: string | null }) {
  return (
    <Document title="Accesso admin">
      <div className="login login--admin">
        <TileBand tall />
        <header className="login__head">
          <h1>
            <Brand size="xl" />
          </h1>
          <p className="login__event">Area dell’organizzatore</p>
        </header>
        {configured ? (
          <form className="admin-login" method="post" action="/admin/login">
            {error ? <Notice tone="danger">{error}</Notice> : null}
            <label className="field">
              <span className="field__label">Password admin</span>
              <input className="input input--big" type="password" name="password" autoComplete="current-password" required autoFocus />
            </label>
            <button className="btn btn--primary btn--block btn--big" type="submit">
              Entra
            </button>
            {devHint ? <p className="field__hint">{devHint}</p> : null}
          </form>
        ) : (
          <Notice tone="warn" icon="key">
            Manca la password admin. Impostala come segreto <code>ADMIN_PASSWORD</code> (vedi README) e ricarica la pagina.
          </Notice>
        )}
        <p className="login__foot">
          <a href="/">Torna all’app dei partecipanti</a>
        </p>
      </div>
    </Document>
  );
}
