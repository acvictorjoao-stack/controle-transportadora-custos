import type {PortalRole} from '@/lib/auth/permissions';

import {createClient} from '@/supabase/client';

import type {PortalUser} from '@/types/portal/user';



/**

 * Busca o papel do Portal Master no cliente (browser) via RPC.

 * Usa get_my_portal_role() — não consulta portal_users diretamente.

 */

export async function getClientPortalUser(): Promise<PortalUser | null> {

  const supabase = createClient();

  const {

    data: {user},

  } = await supabase.auth.getUser();



  if (!user) {

    return null;

  }



  const {data, error} = await supabase.rpc('get_my_portal_role');



  if (error) {

    throw error;

  }



  const role = (data as PortalRole | null) ?? null;



  if (!role) {

    return null;

  }



  return {

    id: user.id,

    profile_id: user.id,

    role,

    active: true,

    created_at: '',

    updated_at: '',

  };

}

