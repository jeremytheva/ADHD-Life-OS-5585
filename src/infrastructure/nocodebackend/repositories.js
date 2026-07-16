import { domainCreateSchemasByCollection, domainPatchSchemasByCollection, domainSchemasByCollection } from '../../domains/schemas'
import { requestDataEndpoint } from './dataClient'
import { DomainValidationError, NoCodeBackendError } from './errors'

const toQuery = (filters = {}) => { const query = new URLSearchParams(); Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== null) query.set(key, String(value)) }); const value = query.toString(); return value ? `?${value}` : '' }
const requireRecord = (record, collection, id) => { if (!record) throw new NoCodeBackendError(`${collection} record ${id} was not found.`, { code: 'NOT_FOUND', status: 404 }); return record }
const validate = (schema, value, message) => { const result = schema.safeParse(value); if (!result.success) throw new DomainValidationError(message, result.error.flatten()); return result.data }

/** Domain repository interface: validates every write and never admits malformed remote records. */
export const createNoCodeBackendRepository = (collection) => {
  const schema = domainSchemasByCollection[collection]
  const createSchema = domainCreateSchemasByCollection[collection]
  const patchSchema = domainPatchSchemasByCollection[collection]
  const parseResponse = (value) => schema ? validate(schema, value, `Invalid ${collection} response.`) : value
  return {
    async list(filters) { const result = await requestDataEndpoint(`${collection}${toQuery(filters)}`); if (!Array.isArray(result)) throw new DomainValidationError(`Invalid ${collection} list response.`, result); return result.map(parseResponse) },
    async get(id, filters = {}) { return requireRecord(parseResponse(await requestDataEndpoint(`${collection}/${encodeURIComponent(id)}${toQuery(filters)}`)), collection, id) },
    async create(record) { const body = createSchema ? validate(createSchema, record, `Invalid ${collection} create request.`) : record; return requireRecord(parseResponse(await requestDataEndpoint(collection, { method: 'POST', body })), collection, 'created') },
    async update(id, record, filters = {}) { const body = patchSchema ? validate(patchSchema, record, `Invalid ${collection} update request.`) : record; return requireRecord(parseResponse(await requestDataEndpoint(`${collection}/${encodeURIComponent(id)}${toQuery(filters)}`, { method: 'PATCH', body })), collection, id) },
    async remove(id, filters = {}) { await requestDataEndpoint(`${collection}/${encodeURIComponent(id)}${toQuery(filters)}`, { method: 'DELETE' }); return true }
  }
}
export const repositories = Object.freeze({ preferences: createNoCodeBackendRepository('user-preferences'), tasks: createNoCodeBackendRepository('tasks'), projects: createNoCodeBackendRepository('projects'), subtasks: createNoCodeBackendRepository('subtasks'), routines: createNoCodeBackendRepository('routines'), routineSteps: createNoCodeBackendRepository('routine-steps'), routineSessions: createNoCodeBackendRepository('routine-sessions'), houseworkTasks: createNoCodeBackendRepository('housework-tasks'), houseworkCompletions: createNoCodeBackendRepository('housework-completions'), inboxItems: createNoCodeBackendRepository('inbox-items') })
