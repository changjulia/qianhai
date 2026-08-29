PRAGMA foreign_keys = ON;

-- This demo account is intentionally scoped to Guizhou tea. Generic Mock
-- records remain available; only seeded content tied to other industries is removed.
UPDATE enterprises
SET name = '贵州茶产业演示企业（Demo）',
    industry = '贵州茶产业'
WHERE id = 'ent-demo-matcha';

UPDATE organizations
SET name = '贵州茶产业 Demo 组织'
WHERE id = 'org-demo-guikesong';

UPDATE customer_workbench_profiles
SET industry = '贵州茶产业'
WHERE customer_id = 'adrian';

DELETE FROM business_state_history
WHERE customer_id IN ('maya', 'omar', 'elena', 'diego', 'sokha');

DELETE FROM orders
WHERE customer_id IN ('maya', 'omar', 'elena', 'diego', 'sokha');

DELETE FROM quotes
WHERE customer_id IN ('maya', 'omar', 'elena', 'diego', 'sokha');

DELETE FROM attribution_events
WHERE customer_id IN ('maya', 'omar', 'elena', 'diego', 'sokha');

DELETE FROM customer_workbench_tasks
WHERE customer_id IN ('maya', 'omar', 'elena', 'diego', 'sokha');

DELETE FROM messages
WHERE conversation_id IN (
  SELECT id FROM conversations
  WHERE customer_id IN ('maya', 'omar', 'elena', 'diego', 'sokha')
);

DELETE FROM conversations
WHERE customer_id IN ('maya', 'omar', 'elena', 'diego', 'sokha');

DELETE FROM opportunities
WHERE customer_id IN ('maya', 'omar', 'elena', 'diego', 'sokha');

DELETE FROM customers
WHERE id IN ('maya', 'omar', 'elena', 'diego', 'sokha');

DELETE FROM organization_node_members
WHERE node_id IN ('org-fruit', 'org-industry');

DELETE FROM organization_nodes
WHERE id IN ('org-fruit', 'org-industry');

UPDATE organization_nodes
SET name = CASE id
  WHEN 'org-group' THEN '贵州茶产业演示集团'
  WHEN 'org-growth' THEN '贵州茶国际增长中心'
  WHEN 'org-tea' THEN '贵州茶事业部'
  ELSE name
END,
updated_at = CURRENT_TIMESTAMP
WHERE id IN ('org-group', 'org-growth', 'org-tea');

PRAGMA optimize;
