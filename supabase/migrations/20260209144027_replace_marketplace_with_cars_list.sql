-- Replace /marketplace references with /cars/list in live DB data
-- The /marketplace route does not exist; the correct route is /cars/list

-- notification_templates: update cta_link
UPDATE notification_templates
SET cta_link = '/cars/list'
WHERE cta_link = '/marketplace';

-- marketing_bio_links: update url
UPDATE marketing_bio_links
SET url = REPLACE(url, '/marketplace', '/cars/list')
WHERE url LIKE '%/marketplace%';

-- sdui_components: update props->ctaLink
UPDATE sdui_components
SET props = jsonb_set(props, '{ctaLink}', '"/cars/list"')
WHERE props->>'ctaLink' = '/marketplace';

-- smart_notification_templates: update deep_link
UPDATE smart_notification_templates
SET deep_link = '/cars/list'
WHERE deep_link = '/marketplace';
