import { config } from '../config.js';
import type { TeamEmailNotifyEvent } from '@quiz-tool/shared';

export function isEmailDeliveryConfigured(): boolean {
  return Boolean(config.resendApiKey && config.emailFrom);
}

interface SendTeamResultEmailInput {
  to: string;
  teamName: string;
  quizTitle: string;
  event: TeamEmailNotifyEvent;
  resultUrl: string;
}

export async function sendTeamResultEmail(input: SendTeamResultEmailInput): Promise<void> {
  if (!isEmailDeliveryConfigured()) {
    if (!config.isProd) {
      console.info('[email] Skipped (RESEND_API_KEY not set):', input.to, input.event, input.resultUrl);
    }
    return;
  }

  const subject =
    input.event === 'final_result_locked'
      ? `Sluttresultat klart — ${input.quizTitle}`
      : `Gruizen er avsluttet — ${input.quizTitle}`;

  const intro =
    input.event === 'final_result_locked'
      ? `Hei ${input.teamName}! Sluttresultatet for «${input.quizTitle}» er nå klart.`
      : `Hei ${input.teamName}! Gruizen «${input.quizTitle}» er avsluttet.`;

  const html = `<!DOCTYPE html>
<html lang="nb">
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a;max-width:32rem">
  <p>${intro}</p>
  <p><a href="${input.resultUrl}" style="display:inline-block;padding:0.75rem 1.25rem;background:#5b21b6;color:#fff;text-decoration:none;border-radius:0.75rem;font-weight:600">Se resultater</a></p>
  <p style="font-size:0.875rem;color:#555">Lenken er personlig for deg og fungerer til denne Gruizen utløper på serveren.</p>
  <p style="font-size:0.75rem;color:#777">Du mottok denne e-posten fordi du ga samtykke til varsler i Gruiz. Trekk samtykket tilbake i spilleren om du ikke vil ha flere e-poster fra denne quizen.</p>
</body>
</html>`;

  const text = `${intro}\n\nSe resultater: ${input.resultUrl}\n\nDu mottok denne e-posten fordi du ga samtykke til varsler i Gruiz.`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.emailFrom,
      to: [input.to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`E-postlevering feilet (${response.status})${body ? `: ${body.slice(0, 200)}` : ''}`);
  }
}
