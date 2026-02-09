-- Replace /marketplace references with /cars/list in live DB data
-- The /marketplace route does not exist; the correct route is /cars/list

-- notifications: update cta_link (column is on `notifications`, NOT `notification_templates`)
UPDATE notifications
SET cta_link = '/cars/list'
WHERE cta_link = '/marketplace';

-- marketing_bio_links: update url
UPDATE marketing_bio_links
SET url = REPLACE(url, '/marketplace', '/cars/list')
WHERE url LIKE '%/marketplace%';

-- Reload PostgREST schema cache (fixes stale RPC resolution e.g. wallet_get_balance)
NOTIFY pgrst, 'reload schema';
