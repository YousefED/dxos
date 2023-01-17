//
// Copyright 2022 DXOS.org
//

import React, { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { Invitation } from '@dxos/client';
import { JoinPanel } from '@dxos/react-appkit';
import { useClient } from '@dxos/react-client';
import { Heading, useTranslation } from '@dxos/react-components';

import { invitationCodeFromUrl } from '../util';

// NOTE: Copied from halo-app.
// TODO(wittjosiah): Utilize @dxos/react-ui patterns.

export const JoinIdentityPage = () => {
  const client = useClient();
  const { t } = useTranslation('appkit');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationParam = searchParams.get('invitation');
  const redirectUrl = searchParams.get('redirect');
  const redirect = useCallback(
    () =>
      redirectUrl?.startsWith('http')
        ? window.location.replace(redirectUrl)
        : navigate(redirectUrl && redirectUrl.length ? redirectUrl : '/devices'),
    [redirectUrl]
  );
  const acceptInvitation = useCallback((invitation: Invitation) => client.halo.acceptInvitation(invitation), [client]);

  return (
    <main className='max-is-lg mli-auto pli-7 mbs-7'>
      <Heading>{t('join identity label')}</Heading>
      <JoinPanel
        initialInvitationCode={invitationParam ?? undefined}
        parseInvitation={(invitationCode) => invitationCodeFromUrl(invitationCode)}
        onJoin={redirect}
        acceptInvitation={acceptInvitation}
      />
    </main>
  );
};