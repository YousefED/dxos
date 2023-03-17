//
// Copyright 2023 DXOS.org
//

import formatDistance from 'date-fns/formatDistance';
import React, { useEffect, useRef, useState } from 'react';
import { Column } from 'react-table';

import { truncateKey } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { useKeyStore } from '@dxos/react-client';
import { Button, getSize, mx, Select, Table } from '@dxos/react-components';

import { Toolbar } from '../../components';
import { botDefs, useAppRouter, useBotClient, getBotEnvs, botKeys } from '../../hooks';

const REFRESH_DELAY = 1000;

type BotRecord = {
  id: string;
  image: string;
  name: string;
  port: number;
  created: number;
  state: string;
  status: string;
};

const columns: Column<BotRecord>[] = [
  {
    Header: 'name',
    accessor: (record) => record.name,
    width: 200
  },
  {
    Header: 'container',
    Cell: ({ value }: any) => <div className='font-mono'>{value}</div>,
    accessor: (record) => truncateKey(PublicKey.from(record.id), { length: 8, start: true }),
    width: 120
  },
  {
    Header: 'image',
    Cell: ({ value }: any) => <div className='font-mono'>{value}</div>,
    accessor: (record) => truncateKey(PublicKey.from(record.image.split(':')[1]), { length: 8, start: true }),
    width: 120
  },
  {
    Header: 'port',
    Cell: ({ value }: any) => <div className='font-mono'>{value}</div>,
    accessor: (record) => record.port,
    width: 80
  },
  {
    Header: 'created',
    accessor: (record) => formatDistance(new Date(record.created), Date.now(), { addSuffix: true }),
    width: 140
  },
  {
    Header: 'state',
    accessor: (record) => record.state,
    width: 100
  },
  {
    Header: 'status',
    accessor: (record) => record.status,
    width: 140
  }
];

export const BotManager = () => {
  const [status, setStatus] = useState('');
  const [records, setRecords] = useState<BotRecord[]>([]);
  const [botId, setBotId] = useState<string>(botDefs[0].module.id!);
  const { space } = useAppRouter();
  const botClient = useBotClient(space!);
  const [keyMap] = useKeyStore(Object.keys(botKeys));

  useEffect(() => {
    void refresh();
    return botClient.onStatusUpdate.on((status) => {
      setStatus(status);
      void refresh();
    });
  }, [botClient]);

  // TODO(burdon): Error handling.
  // TODO(burdon): Show status in a pending table row.
  const refreshTimeout = useRef<ReturnType<typeof setTimeout>>();
  const refresh = () => {
    clearTimeout(refreshTimeout.current);
    refreshTimeout.current = setTimeout(async () => {
      refreshTimeout.current = undefined;

      const response = await botClient?.getBots();
      const records = response.map((record: any) => ({
        id: record.Id,
        image: record.ImageID,
        name: record.Labels['dxos.bot.name'],
        port: record.Ports[0].PublicPort,
        created: new Date(record.Created * 1000).getTime(),
        state: record.State,
        status: record.Status
      }));

      setRecords(records);
      setStatus('');
    }, REFRESH_DELAY);
  };

  const handleDelete = async () => {
    await botClient?.removeBots();
    refresh();
  };

  if (!botClient) {
    return null;
  }

  return (
    <div className='flex-1 flex-col px-2 overflow-hidden'>
      <Toolbar className='justify-between'>
        <div className='flex items-center space-x-2'>
          <Select value={botId} onValueChange={setBotId}>
            {botDefs.map(({ module: { id, displayName }, runtime: { Icon } }) => (
              <Select.Item key={id} value={id!}>
                <div className='flex items-center'>
                  <Icon className={mx(getSize(5), 'mr-2')} />
                  {displayName}
                </div>
              </Select.Item>
            ))}
          </Select>
          <Button className='mr-2' onClick={() => botId && botClient.startBot(botId, getBotEnvs(keyMap))}>
            Start
          </Button>
        </div>
        <div className='flex items-center space-x-2'>
          <Button onClick={() => botId && botClient.fetchImage()}>Pull Image</Button>
          <Button onClick={handleDelete}>Reset</Button>
          <Button onClick={refresh}>Refresh</Button>
        </div>
      </Toolbar>

      <Table
        columns={columns}
        data={records}
        slots={{
          header: { className: 'bg-paper-1-bg' },
          row: { className: 'hover:bg-hover-bg odd:bg-table-rowOdd even:bg-table-rowEven' }
        }}
      />

      <div className='mt-2 p-2'>{status}</div>
    </div>
  );
};