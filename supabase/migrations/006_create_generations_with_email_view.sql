-- Create a view that joins generations with user emails
-- This view can be accessed with Service Role Key
CREATE OR REPLACE VIEW generations_with_email AS
SELECT 
  g.*,
  u.email as user_email
FROM 
  public.generations g
  LEFT JOIN auth.users u ON g.user_id = u.id;

-- Grant permissions on the view
GRANT SELECT ON generations_with_email TO service_role;
GRANT SELECT ON generations_with_email TO authenticated;