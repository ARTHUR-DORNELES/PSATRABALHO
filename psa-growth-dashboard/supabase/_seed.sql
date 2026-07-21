-- =====================================================================
-- Carga base (NÃO é dado fake de experimento): canais e catálogo de
-- métricas que o formulário de cadastro precisa. Idempotente.
-- =====================================================================
insert into channels (key, name, kind, source_system, source_config) values
  ('email',      'E-mail Marketing',        'EMAIL',           'HUBSPOT', '{"hs_marketing_email":true}'),
  ('whatsapp',   'WhatsApp (N8N)',          'WHATSAPP',        'N8N',     '{"tag_prefix":"exp_"}'),
  ('organic',    'Conteúdo orgânico / LPs', 'ORGANIC_CONTENT', 'HUBSPOT', '{"utm_medium":"organic"}'),
  ('meta_ads',   'Meta Ads',                'META_ADS',        'META',    '{"utm_source":"meta"}'),
  ('google_ads', 'Google Ads',              'GOOGLE_ADS',      'GOOGLE',  '{"utm_source":"google"}')
on conflict (key) do nothing;

insert into metric_definitions (key, label, kind, unit, rate_of, higher_is_better) values
  ('sent',        'Enviados',                  'COUNT',    'envios',    '{}', 1),
  ('delivered',   'Entregues',                 'COUNT',    'msgs',      '{}', 1),
  ('opens',       'Aberturas',                 'COUNT',    'aberturas', '{}', 1),
  ('clicks',      'Cliques',                   'COUNT',    'cliques',   '{}', 1),
  ('replies',     'Respostas',                 'COUNT',    'respostas', '{}', 1),
  ('impressions', 'Impressões',                'COUNT',    'impr.',     '{}', 1),
  ('sessions',    'Sessões',                   'COUNT',    'sessões',   '{}', 1),
  ('leads',       'Leads',                     'COUNT',    'leads',     '{}', 1),
  ('mql',         'MQL',                       'COUNT',    'mql',       '{}', 1),
  ('sql',         'SQL',                       'COUNT',    'sql',       '{}', 1),
  ('deals',       'Negócios',                  'COUNT',    'deals',     '{}', 1),
  ('open_rate',   'Taxa de abertura',          'RATE',     '%',         '{"numerator":"opens","denominator":"sent"}',         1),
  ('click_rate',  'Taxa de clique',            'RATE',     '%',         '{"numerator":"clicks","denominator":"sent"}',        1),
  ('reply_rate',  'Taxa de resposta',          'RATE',     '%',         '{"numerator":"replies","denominator":"delivered"}',  1),
  ('lead_rate',   'Taxa de conversão (lead)',  'RATE',     '%',         '{"numerator":"leads","denominator":"clicks"}',       1),
  ('revenue',     'Receita',                   'CURRENCY', 'BRL',       '{}', 1),
  ('cost',        'Investimento',              'CURRENCY', 'BRL',       '{}', 1),
  ('cac',         'CAC',                       'RATIO',    'BRL',       '{}', -1)
on conflict (key) do nothing;
