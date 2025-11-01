
BEGIN;
SELECT plan(4);

-- columnas esperadas
SELECT has_table('public', 'messages', 'messages table exists');
SELECT has_column('public','messages','conversation_id','conversation_id exists');
SELECT has_column('public','messages','sender_id','sender_id exists');
SELECT hasnt_column('public','messages','full_name','full_name must NOT exist');

-- opcional: FK y NOT NULL
-- SELECT col_not_null('public','messages','text');
-- SELECT fk_ok('public','messages','sender_id','public','profiles','id');

SELECT * FROM finish();
ROLLBACK;
