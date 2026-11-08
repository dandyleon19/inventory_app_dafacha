import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"
import { clearAuthTokens, getAccessToken, getRefreshToken, setAuthTokens, tryRefreshToken } from "~/composables/useAuthTokens"

const APP = "inventory"

const cookieNamed = (name: string) =>
  document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`))
    ?.slice(name.length + 1)

/** useCookie writes to document.cookie on the next tick. */
const signIn = async (access: string, refresh: string) => {
  setAuthTokens(access, refresh)
  await nextTick()
}

const setRawCookie = (name: string, value: string) => {
  document.cookie = `${name}=${value}; path=/`
}

beforeEach(async () => {
  clearAuthTokens()
  await nextTick()
  setRawCookie("access_token", "")
  setRawCookie("refresh_token", "")
})

afterEach(() => {
  vi.unstubAllGlobals()
  // the setup file's global stubs are put back
  vi.stubGlobal("visualViewport", {
    width: 1024,
    height: 768,
    offsetLeft: 0,
    offsetTop: 0,
    scale: 1,
    addEventListener: () => {},
    removeEventListener: () => {},
  })
})

describe("session cookies", () => {
  it("are named after the app, so another app on the same host (another port) cannot overwrite them", async () => {
    setRawCookie("access_token", "tokens-of-the-other-app")
    setRawCookie("refresh_token", "refresh-of-the-other-app")

    await signIn("access-1", "refresh-1")

    expect(cookieNamed(`${APP}_access_token`)).toBe("access-1")
    expect(cookieNamed(`${APP}_refresh_token`)).toBe("refresh-1")
    // The other app's cookies are neither read nor touched.
    expect(cookieNamed("access_token")).toBe("tokens-of-the-other-app")
    expect(cookieNamed("refresh_token")).toBe("refresh-of-the-other-app")
    expect(getAccessToken()).toBe("access-1")
    expect(getRefreshToken()).toBe("refresh-1")
  })

  it("clearing the session leaves the other app's cookies alone", async () => {
    setRawCookie("access_token", "tokens-of-the-other-app")
    await signIn("access-1", "refresh-1")

    clearAuthTokens()
    await nextTick()

    expect(getAccessToken()).toBeFalsy()
    expect(getRefreshToken()).toBeFalsy()
    expect(cookieNamed("access_token")).toBe("tokens-of-the-other-app")
  })
})

describe("refreshing the session", () => {
  it("renews both tokens", async () => {
    await signIn("old-access", "old-refresh")
    const fetchMock = vi.fn().mockResolvedValue({ token: "new-access", refreshToken: "new-refresh" })
    vi.stubGlobal("$fetch", fetchMock)

    expect(await tryRefreshToken()).toBe(true)
    expect(fetchMock.mock.calls[0]![1].body).toEqual({ refreshToken: "old-refresh" })
    await nextTick()
    expect(getAccessToken()).toBe("new-access")
    expect(getRefreshToken()).toBe("new-refresh")
  })

  it("does not call the server without a refresh token", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("$fetch", fetchMock)
    expect(await tryRefreshToken()).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("answers false when the server refuses and nobody else renewed the token", async () => {
    await signIn("old-access", "old-refresh")
    const fetchMock = vi.fn().mockRejectedValue(new Error("401"))
    vi.stubGlobal("$fetch", fetchMock)

    expect(await tryRefreshToken()).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("uses the token another tab renewed first instead of ending the session (the refresh token is used once)", async () => {
    await signIn("old-access", "old-refresh")
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async () => {
        // While this request was in flight, another tab got new tokens and stored them.
        setRawCookie(`${APP}_refresh_token`, "refresh-from-other-tab")
        throw new Error("401")
      })
      .mockResolvedValueOnce({ token: "final-access", refreshToken: "final-refresh" })
    vi.stubGlobal("$fetch", fetchMock)

    expect(await tryRefreshToken()).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1]![1].body).toEqual({ refreshToken: "refresh-from-other-tab" })
    await nextTick()
    expect(getAccessToken()).toBe("final-access")
  })

  it("tries only once more, so a really invalid session still ends", async () => {
    await signIn("old-access", "old-refresh")
    let calls = 0
    const fetchMock = vi.fn().mockImplementation(async () => {
      calls += 1
      setRawCookie(`${APP}_refresh_token`, `different-${calls}`)
      throw new Error("401")
    })
    vi.stubGlobal("$fetch", fetchMock)

    expect(await tryRefreshToken()).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
