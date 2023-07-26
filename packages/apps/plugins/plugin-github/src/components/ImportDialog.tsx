//
// Copyright 2023 DXOS.org
//

import React, { RefObject, useCallback } from 'react';

import { Button, Dialog, useTranslation } from '@dxos/aurora';
import { MarkdownComposerRef } from '@dxos/aurora-composer';
import { log } from '@dxos/log';

import { GITHUB_PLUGIN, GhFileIdentifier, GhIdentifier, GhIssueIdentifier } from '../props';
import { useOctokitContext } from './GithubApiProviders';

export const ImportDialog = ({
  data: [_, docGhId, editorRef],
}: {
  data: [string, GhIdentifier, RefObject<MarkdownComposerRef>];
}) => {
  const { t } = useTranslation(GITHUB_PLUGIN);
  const { octokit } = useOctokitContext();

  const importGhIssueContent = useCallback(async () => {
    if (octokit && docGhId && 'issueNumber' in docGhId && editorRef.current?.view && editorRef.current?.state?.doc) {
      try {
        const { owner, repo, issueNumber } = docGhId as GhIssueIdentifier;
        const { data } = await octokit.rest.issues.get({ owner, repo, issue_number: issueNumber });
        editorRef.current.view.dispatch({
          changes: { from: 0, to: editorRef.current.view.state.doc.length, insert: data.body ?? '' },
        });
      } catch (err) {
        log.error('Failed to import from Github issue', err);
      }
    } else {
      log.error('Not prepared to import from Github issue when requested.');
    }
  }, [octokit, docGhId, editorRef.current]);

  const importGhFileContent = useCallback(async () => {
    if (octokit && docGhId && 'path' in docGhId && editorRef.current?.view && editorRef.current?.state?.doc) {
      try {
        const { owner, repo, path } = docGhId as GhFileIdentifier;
        const { data } = await octokit.rest.repos.getContent({ owner, repo, path });
        if (!Array.isArray(data) && data.type === 'file') {
          editorRef.current.view.dispatch({
            changes: { from: 0, to: editorRef.current.view.state.doc.length, insert: atob(data.content) },
          });
        } else {
          log.error('Did not receive file with content from Github.');
        }
      } catch (err) {
        log.error('Failed to import from Github file', err);
      }
    } else {
      log.error('Not prepared to import from Github file when requested.');
    }
  }, [octokit, docGhId, editorRef.current]);

  const handleGhImport = useCallback(() => {
    return (
      docGhId && ('issueNumber' in docGhId ? importGhIssueContent() : 'path' in docGhId ? importGhFileContent() : null)
    );
  }, [importGhIssueContent, importGhFileContent, docGhId]);

  return (
    <>
      <Dialog.Title>{t('confirm import title', { ns: 'composer' })}</Dialog.Title>
      <p className='plb-2'>{t('confirm import body', { ns: 'composer' })}</p>
      <div role='none' className='flex justify-end gap-2'>
        <Dialog.Close asChild>
          <Button>{t('cancel label', { ns: 'appkit' })}</Button>
        </Dialog.Close>
        <Dialog.Close asChild>
          <Button variant='primary' onClick={handleGhImport}>
            {t('import from github label')}
          </Button>
        </Dialog.Close>
      </div>
    </>
  );
};
