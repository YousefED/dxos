//
// Copyright 2022 DXOS.org
//

import React, { useCallback } from 'react';

import { Space, TextObject } from '@dxos/client';
import { SpacesPage as BaseSpacesPage } from '@dxos/react-appkit';

import { ComposerDocument } from '../proto';

export type SpacesPageProps = {};

export const SpacesPage = (props: SpacesPageProps) => {
  const createComposerDocument = useCallback(async (space: Space) => {
    await space.db.add(new ComposerDocument({ content: new TextObject() }));
  }, []);

  return <BaseSpacesPage onSpaceCreate={createComposerDocument} />;
};
