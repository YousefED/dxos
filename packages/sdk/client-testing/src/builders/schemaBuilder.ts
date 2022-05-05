//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import faker from 'faker';

import { Database, Schema, SchemaDef, SchemaField, TYPE_SCHEMA } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

export const log = debug('dxos:client-testing');
debug.enable('dxos:client-testing');

export type SchemaFieldWithGenerator = SchemaField & { generator: () => string }
export type SchemaDefWithGenerator = Omit<SchemaDef, 'fields'> & { fields: SchemaFieldWithGenerator[] };

enum TestType {
  Org = 'example:type/org',
  Person = 'example:type/person'
}

const defaultSchemaDefs: { [schema: string]: SchemaDefWithGenerator } = {
  [TestType.Org]: {
    schema: 'example:type/schema/organization',
    fields: [
      {
        key: 'title',
        required: true,
        generator: () => faker.company.companyName()
      },
      {
        key: 'website',
        required: false,
        generator: () => faker.internet.url()
      },
      {
        key: 'collaborators',
        required: false,
        generator: () => faker.datatype.number().toString()
      }
    ]
  },
  [TestType.Person]: {
    schema: 'example:type/schema/person',
    fields: [
      {
        key: 'title',
        required: true,
        generator: () => `${faker.name.firstName()} ${faker.name.lastName()}`
      }
    ]
  }
};

export class SchemaBuilder {
  constructor (
    private readonly _database: Database
  ) {}

  get defaultSchemas () {
    return defaultSchemaDefs;
  }

  async createSchemas (customSchemas?: SchemaDefWithGenerator[]) {
    const schemas = customSchemas ?? Object.values(defaultSchemaDefs);
    log(`Creating schemas: [${schemas.map(({ schema }) => schema).join()}]`);

    const schemaItems = await Promise.all(schemas.map(({ schema, fields }) => {
      const schemaFields = fields.map(fieldWithGenerator => {
        // eslint-disable-next-line unused-imports/no-unused-vars
        const { generator, ...field } = fieldWithGenerator;
        return field;
      }).flat();

      return this._database.createItem({
        model: ObjectModel,
        type: TYPE_SCHEMA,
        props: {
          schema,
          fields: schemaFields
        }
      });
    }));

    return schemaItems.map(item => new Schema(item.model));
  }

  /**
 * Create items for a given schema.
 * NOTE: Assumes that referenced items have already been constructed.
 */
  async createItems ({ schema, fields }: SchemaDefWithGenerator, numItems: number) {
    log(`Creating items for: ${schema}`);

    return await Promise.all(Array.from({ length: numItems }).map(async () => {
      const values = fields.map(field => {
        if (field.ref) {
        // Look-up item.
          const { entities: items } = this._database.select().filter({ type: field.ref.schema }).exec();
          if (items.length) {
            return {
              [field.key]: faker.random.arrayElement(items).id
            };
          }
        } else {
          return {
            [field.key]: field.generator()
          };
        }

        return undefined;
      }).filter(Boolean);

      return await this._database.createItem({
        type: schema,
        props: Object.assign({}, ...values)
      });
    }));
  }

  /**
 * Create data for all schemas.
 */
  async createData (customSchemas?: SchemaDefWithGenerator[], options: { [key: string]: number } = {}) {
    const schemas = customSchemas ?? Object.values(defaultSchemaDefs);
    // Synchronous loop.
    for (const schema of schemas) {
      const count = options[schema.schema] ?? 0;
      if (count) {
        await this.createItems(schema, count);
      }
    }
  }
}