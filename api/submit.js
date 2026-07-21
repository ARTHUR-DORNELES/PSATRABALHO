module.exports = async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const { email, firstname, lastname, phone, macro_tema_contato, budget, data_do_evento, publico_estimado_do_evento, utm_source, utm_medium, utm_campaign } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });

  const TOKEN = (process.env.HUBSPOT_TOKEN || '').replace(/^﻿/, '');
  const hs = (path, method, body) => fetch(`https://api.hubapi.com${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
    body: body ? JSON.stringify(body) : undefined,
  });

  const hoje = new Date(); hoje.setUTCHours(0, 0, 0, 0);
  const emailNorm = email.toLowerCase().trim();

  // ── props do contato ─────────────────────────────────────
  const contactProps = {};
  if (firstname) contactProps.firstname = firstname;
  if (lastname)  contactProps.lastname  = lastname;
  if (phone) {
    const digits = String(phone).replace(/\D/g, '');
    const local = digits.startsWith('55') ? digits.slice(2) : digits;
    if (local.length >= 10) contactProps.phone = `+55${local}`;
  }
  if (macro_tema_contato) contactProps.macro_tema_contato = macro_tema_contato;
  if (budget)             contactProps.budget             = budget;
  if (utm_source)         contactProps.utm_source         = utm_source;
  if (utm_medium)         contactProps.utm_medium         = utm_medium;
  if (utm_campaign)       contactProps.utm_campaign       = utm_campaign;
  if (data_do_evento) {
    const d = new Date(Number(data_do_evento)); d.setUTCHours(0, 0, 0, 0);
    contactProps.data_do_evento = d.getTime();
  }
  if (publico_estimado_do_evento) contactProps.publico_estimado_do_evento = publico_estimado_do_evento;
  contactProps.curadoria_pocket         = true;
  contactProps.data_da_curadoria_pocket = hoje.getTime();

  try {
    // ── 1. Buscar contato por e-mail → atualizar ou criar ──
    let contactId;
    const searchRes  = await hs('/crm/v3/objects/contacts/search', 'POST', {
      filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: emailNorm }] }],
      properties: ['email'],
      limit: 1,
    });
    const searchData = await searchRes.json();

    if (!searchRes.ok) {
      console.error('Contact search error:', JSON.stringify(searchData));
      return res.status(500).json({ error: 'hubspot_search_error', detail: searchData });
    }

    if (searchData.total > 0) {
      // Contato existe → atualiza
      contactId = searchData.results[0].id;
      const patchRes  = await hs(`/crm/v3/objects/contacts/${contactId}`, 'PATCH', { properties: contactProps });
      const patchData = await patchRes.json();
      if (!patchRes.ok) {
        console.error('Contact update error:', JSON.stringify(patchData));
        return res.status(500).json({ error: 'hubspot_error', detail: patchData });
      }
    } else {
      // Contato novo → cria
      contactProps.email = emailNorm;
      let createRes  = await hs('/crm/v3/objects/contacts', 'POST', { properties: contactProps });
      let createData = await createRes.json();

      // Se falhou por validação, tenta de novo só com campos seguros
      if (!createRes.ok && createData.category === 'VALIDATION_ERROR') {
        console.warn('Contact create validation error, retrying with safe props:', JSON.stringify(createData));
        const safeProps = {
          email:                    emailNorm,
          curadoria_pocket:         true,
          data_da_curadoria_pocket: hoje.getTime(),
        };
        if (firstname) safeProps.firstname = firstname;
        if (lastname)  safeProps.lastname  = lastname;
        createRes  = await hs('/crm/v3/objects/contacts', 'POST', { properties: safeProps });
        createData = await createRes.json();
      }

      if (!createRes.ok) {
        console.error('Contact create error:', JSON.stringify(createData));
        return res.status(500).json({ error: 'hubspot_error', detail: createData });
      }
      contactId = createData.id;
    }

    // ── 2. Criar negócio ─────────────────────────────────
    const name = [firstname, lastname].filter(Boolean).join(' ') || emailNorm;
    const dealProps = {
      dealname:         `Curadoria Pocket · ${name}`,
      pipeline:         'default',
      dealstage:        'appointmentscheduled',
      curadoria_pocket: true,
    };
    if (budget) dealProps.budget = budget;

    const dealRes  = await hs('/crm/v3/objects/deals', 'POST', { properties: dealProps });
    const dealData = await dealRes.json();
    if (!dealRes.ok) {
      console.error('Deal create error:', JSON.stringify(dealData));
      return res.status(200).json({ ok: true, warn: 'deal_failed', dealError: dealData });
    }

    const dealId = dealData.id;

    // ── 3. Associar negócio → contato ───────────────────
    if (contactId && dealId) {
      await hs(`/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/deal_to_contact`, 'PUT');
    }

    return res.status(200).json({ ok: true, contactId, dealId });
  } catch (e) {
    console.error('Fetch error:', e.message);
    return res.status(500).json({ error: e.message });
  }
};
