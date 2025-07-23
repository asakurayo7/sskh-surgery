import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))

    if (!user || user.app_metadata?.role !== 'admin') {
      throw new Error('Permission denied: User is not an admin.')
    }

    const { action, payload } = await req.json()
    let responseData: any;

    switch (action) {
      case 'list_users':
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
        if (error) throw error;
        responseData = users;
        break;

      case 'delete_user':
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(payload.userId);
        if (deleteError) throw deleteError;
        responseData = { message: `User ${payload.userId} deleted successfully.` };
        break;
        
      case 'invite_user':
        const { email, username, full_name } = payload;
        if (!email || !username || !full_name) {
          throw new Error('Email, username, and full name are required.');
        }
        
        const { data: { user: invitedUser }, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
          email,
          { data: { username, full_name, role: 'doctor' } }
        );

        if (inviteError) throw inviteError;
        responseData = { message: `Invitation sent successfully to ${email}.`, user: invitedUser };
        break;

      default:
        throw new Error('Invalid action provided.');
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

