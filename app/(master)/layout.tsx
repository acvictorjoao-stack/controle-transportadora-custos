import {MasterLayout} from '@/components/layout/master-layout';

import {NavPermissionsProvider} from '@/contexts/auth/nav-permissions-context';

import {requireOwner} from '@/lib/auth/guards';



export default async function MasterGroupLayout({

  children,

}: {

  children: React.ReactNode;

}) {

  await requireOwner();



  return (

    <NavPermissionsProvider permissions={['*']}>

      <MasterLayout>{children}</MasterLayout>

    </NavPermissionsProvider>

  );

}

