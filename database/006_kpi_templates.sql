CREATE TABLE IF NOT EXISTS kpi_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  category    text NOT NULL DEFAULT 'Custom',
  icon        text NOT NULL DEFAULT '📋',
  fields      jsonb NOT NULL DEFAULT '[]',
  used_in     integer NOT NULL DEFAULT 0,
  is_default  boolean NOT NULL DEFAULT false,
  created_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Seed the 4 default templates
INSERT INTO kpi_templates (name, category, icon, fields, used_in, is_default) VALUES
('Revenue Growth', 'Sales', '💰', '[
  {"id":"f1","label":"KPI Name","type":"text","required":true},
  {"id":"f2","label":"Country / Region","type":"dropdown","required":true,"opts":["India","China","SEA","APAC"]},
  {"id":"f3","label":"KPI Type","type":"dropdown","required":true,"opts":["Quantitative","Qualitative"]},
  {"id":"f4","label":"Target Value","type":"currency","required":true},
  {"id":"f5","label":"Financial Year","type":"date","required":true},
  {"id":"f6","label":"Measurement Frequency","type":"dropdown","required":false,"opts":["Monthly","Every 2 Weeks","Quarterly","Annual"]},
  {"id":"f7","label":"Baseline Value","type":"currency","required":false}
]'::jsonb, 4, true),
('Customer Satisfaction', 'CX', '⭐', '[
  {"id":"f1","label":"KPI Name","type":"text","required":true},
  {"id":"f2","label":"Region","type":"dropdown","required":true,"opts":["India","China","SEA","APAC"]},
  {"id":"f3","label":"KPI Type","type":"dropdown","required":true,"opts":["Quantitative","Qualitative"]},
  {"id":"f4","label":"CSAT Target (%)","type":"percentage","required":true},
  {"id":"f5","label":"Survey Method","type":"dropdown","required":true,"opts":["NPS","CSAT","CES"]}
]'::jsonb, 2, true),
('Operational Excellence', 'Ops', '⚡', '[
  {"id":"f1","label":"KPI Name","type":"text","required":true},
  {"id":"f2","label":"Region","type":"dropdown","required":true,"opts":["India","China","SEA","APAC"]},
  {"id":"f3","label":"KPI Type","type":"dropdown","required":true,"opts":["Quantitative","Qualitative"]},
  {"id":"f4","label":"OTD Target (%)","type":"percentage","required":true},
  {"id":"f5","label":"Scope","type":"dropdown","required":true,"opts":["Projects","Shipments","Tickets"]}
]'::jsonb, 2, true),
('HR Engagement', 'HR', '🤝', '[
  {"id":"f1","label":"KPI Name","type":"text","required":true},
  {"id":"f2","label":"Region","type":"dropdown","required":true,"opts":["India","China","SEA","APAC"]},
  {"id":"f3","label":"KPI Type","type":"dropdown","required":true,"opts":["Quantitative","Qualitative"]},
  {"id":"f4","label":"Engagement Score Target","type":"percentage","required":true},
  {"id":"f5","label":"Survey Frequency","type":"dropdown","required":false,"opts":["Monthly","Quarterly","Annual"]}
]'::jsonb, 1, true)
ON CONFLICT DO NOTHING;
