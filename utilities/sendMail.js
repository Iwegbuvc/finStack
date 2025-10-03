const {
  TransactionalEmailsApi,
  TransactionalEmailsApiApiKeys
} = require('@getbrevo/brevo');

const transactionalEmailsApi = new TransactionalEmailsApi();

// set the API key 
transactionalEmailsApi.setApiKey(
  TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

/**
 * sendMail - send an email via Brevo SDK
 * @param {string} to 
 * @param {string} subject 
 * @param {string} htmlContent 
 * @param {string} [toName] 
 */
async function sendMail(to, subject, htmlContent, toName = '') {
  if (!process.env.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is not set in environment');
  }
  if (!process.env.BREVO_FROM_EMAIL) {
    throw new Error('BREVO_FROM_EMAIL is not set in environment');
  }

  try {
    const payload = {
      sender: {
        email: process.env.BREVO_FROM_EMAIL,
        name: 'FinStack'
      },
      to: [{ email: to}],
      subject,
      htmlContent,
      textContent: (htmlContent || '').replace(/<[^>]+>/g, '') // optional fallback plain text
    };

    const result = await transactionalEmailsApi.sendTransacEmail(payload);

   
    const messageId = result?.body?.messageId ?? result?.messageId ?? JSON.stringify(result);
    console.log('Email sent! Message ID:', messageId);

    return result;
  }  catch (err) {
  console.error(
    'Brevo sendMail error:',
    err?.response?.body ?? err?.response ?? err?.message ?? err
  );
  throw err;
}
}

module.exports = sendMail;