/** Link dell'app da condividere con gli invitati. */
import { Icon } from '../components/Icon';
import { toast } from '../lib/toast';

export interface ShareLinkProps {
  url: string;
  eventName: string;
}

export default function ShareLink({ url, eventName }: ShareLinkProps) {
  const text = `${eventName}: vota le pizze della serata da qui ${url}`;
  return (
    <div className="share">
      <code className="share__url">{url.replace(/^https?:\/\//, '')}</code>
      <div className="share__actions">
        <button
          type="button"
          className="btn btn--small btn--secondary"
          onClick={async () => {
            try {
              if (navigator.share) await navigator.share({ title: eventName, text, url });
              else {
                await navigator.clipboard.writeText(url);
                toast('Link copiato', 'ok');
              }
            } catch {
              /* annullato */
            }
          }}
        >
          <Icon name="share" size={16} /> <span>Condividi</span>
        </button>
        <a className="btn btn--small btn--ghost" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
          WhatsApp
        </a>
      </div>
    </div>
  );
}
