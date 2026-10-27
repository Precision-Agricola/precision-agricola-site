// Envío de leads compartido por /biorreactores, /kit-biorreactor y /biofabrica.
// Portado de themes/precision-agricola/partials/site/enviar-lead.htm.
//
// Primero pasa por /api/lead.php, que reenvía al Google Form desde el servidor
// y sí puede leer si Google aceptó la respuesta. Con fetch no-cors directo la
// respuesta es opaca: el navegador mostraba "gracias" aunque Google la
// rechazara (issue #35).
//
// Si el PHP no responde, se envía directo como antes, así que en el peor caso
// el comportamiento es el de siempre. Solo un rechazo explícito de Google (422)
// lanza error para que el formulario lo muestre.
//
//   import { enviarLead, registrarLead } from '../scripts/enviar-lead';
//   await enviarLead(new URLSearchParams({ 'entry.123': 'valor' }));
//   registrarLead();

const tipo = { 'Content-Type': 'application/x-www-form-urlencoded' };

export async function enviarLead(params: URLSearchParams): Promise<void> {
  const body = params.toString();
  let r: Response | null = null;
  try {
    r = await fetch('/api/lead.php', {
      method: 'POST',
      headers: { Accept: 'application/json', ...tipo },
      body,
    });
  } catch {
    r = null;
  }

  if (r) {
    const datos = await r.json().catch(() => null);
    if (r.ok && datos?.ok) return;
    if (r.status === 422 && datos?.motivo === 'rechazado') throw new Error('rechazado');
  }

  // Respaldo: la URL va ofuscada en base64 a propósito (ver tools/apps-script-leads/RELEVO.md).
  await fetch(atob('aHR0cHM6Ly9kb2NzLmdvb2dsZS5jb20vZm9ybXMvZC9lLzFGQUlwUUxTZHVGVUxzSElVdmhQN1NBdGZPb1Y0MjJWTzVIUTVBNnZnQjVKMXQxV3k1ekZtcWV3L2Zvcm1SZXNwb25zZQ=='), {
    method: 'POST',
    mode: 'no-cors',
    headers: tipo,
    body,
  });
}

// Evento Lead de Meta, una sola vez por visitante (como en /bioreactores).
export function registrarLead(): void {
  const w = window as typeof window & { fbq?: (...args: unknown[]) => void };
  try {
    if (typeof w.fbq === 'function' && !localStorage.getItem('pa_lead_fired')) {
      w.fbq('track', 'Lead');
      localStorage.setItem('pa_lead_fired', '1');
    }
  } catch {
    // localStorage bloqueado: no se registra, el lead ya se envió.
  }
}
