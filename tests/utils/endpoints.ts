import { registerEndpoint } from "@nuxt/test-utils/runtime"

export interface RecordedEndpoint {
  /** The JSON bodies the endpoint received, in order. */
  bodies: any[]
  /** Forget what was received (call it in `beforeEach`). */
  reset: () => void
}

/**
 * Answers `method url` with `response` (a value, or a function of the request body) and remembers the bodies it
 * received, so a spec can check what a screen sent to the API. The app's real `$api` talks to these mocked endpoints.
 */
export const recordEndpoint = (
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  response: unknown | ((body: any) => unknown) = {}
): RecordedEndpoint => {
  const bodies: any[] = []

  registerEndpoint(url, {
    method,
    handler: async (event: any) => {
      let body: any = null
      if (method === "POST" || method === "PUT") {
        const { readBody } = await import("h3")
        body = await readBody(event)
      }
      bodies.push(body)
      return typeof response === "function" ? (response as (body: any) => unknown)(body) : response
    },
  })

  return { bodies, reset: () => bodies.splice(0, bodies.length) }
}

/** Answers `GET url` with a function of the query string and remembers every query it received. */
export const recordQueryEndpoint = (url: string, respond: (query: Record<string, string>) => unknown) => {
  const queries: Array<Record<string, string>> = []

  registerEndpoint(url, {
    method: "GET",
    handler: async (event: any) => {
      const { getQuery } = await import("h3")
      const query = getQuery(event) as Record<string, string>
      queries.push(query)
      return respond(query)
    },
  })

  return { queries, reset: () => queries.splice(0, queries.length) }
}

/**
 * The server side of a picker over `url` (services, products...): the list, searched by name, and each record by id.
 */
export const registerRecordEndpoints = (url: string, records: Array<Record<string, any>>) => {
  const list = recordQueryEndpoint(url, (query) => {
    const term = (query.search ?? "").toLowerCase()
    const matches = term ? records.filter((item) => String(item.name).toLowerCase().includes(term)) : records
    const size = Number(query.size ?? 20)
    const pageNumber = Number(query.page ?? 0)
    return {
      content: matches.slice(pageNumber * size, (pageNumber + 1) * size),
      page: pageNumber,
      size,
      totalElements: matches.length,
      totalPages: Math.max(1, Math.ceil(matches.length / size)),
    }
  })
  for (const record of records) recordQueryEndpoint(`${url}/${record.id}`, () => record)
  return list
}

const page = (content: unknown[]) => ({ content, page: 0, size: 20, totalElements: content.length, totalPages: 1 })

/**
 * The server side of the client and professional pickers: the list (with its search) and the record by id.
 * Call it at the top of a spec that mounts a form with those pickers.
 */
export const registerPeopleEndpoints = (
  clients: Array<Record<string, any>>,
  users: Array<Record<string, any>>
) => {
  const search = (all: Array<Record<string, any>>, term?: string) =>
    term ? all.filter((item) => `${item.firstName} ${item.lastName}`.toLowerCase().includes(term.toLowerCase())) : all

  const clientList = recordQueryEndpoint("/api/clients", (query) => page(search(clients, query.search)))
  const userList = recordQueryEndpoint("/api/users", (query) => page(search(users, query.search)))
  for (const client of clients) recordQueryEndpoint(`/api/clients/${client.id}`, () => client)
  for (const user of users) recordQueryEndpoint(`/api/users/${user.id}`, () => user)

  return { clientList, userList }
}
