-- Helper function: Actualizar stats de persona después de posting
CREATE OR REPLACE FUNCTION public.update_persona_stats(
  p_persona_id UUID,
  p_action_type TEXT -- 'post' | 'comment'
)
RETURNS void AS $$
BEGIN
  IF p_action_type = 'post' THEN
    UPDATE public.marketing_personas
    SET 
      last_post_at = NOW(),
      posts_today = posts_today + 1
    WHERE id = p_persona_id;
  ELSIF p_action_type = 'comment' THEN
    UPDATE public.marketing_personas
    SET 
      last_comment_at = NOW(),
      comments_today = comments_today + 1
    WHERE id = p_persona_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated users (llamado desde Edge Function)
GRANT EXECUTE ON FUNCTION public.update_persona_stats TO authenticated;
