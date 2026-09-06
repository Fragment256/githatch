// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest'
import sodium from 'libsodium-wrappers'
import { encryptSecret, putRepoSecret, checkSecretExists } from './secrets'

async function makeTestPublicKeyB64(): Promise<{ keyB64: string; keyId: string }> {
  await sodium.ready
  const keypair = sodium.crypto_box_keypair()
  const keyB64 = sodium.to_base64(keypair.publicKey, sodium.base64_variants.ORIGINAL)
  return { keyB64, keyId: 'test-key-id' }
}

describe('encryptSecret', () => {
  it('returns a non-empty encrypted_value and the key_id', async () => {
    const { keyB64, keyId } = await makeTestPublicKeyB64()
    const result = await encryptSecret('gho_my_token', keyB64, keyId)
    expect(result.encrypted_value).toBeTruthy()
    expect(result.key_id).toBe(keyId)
    expect(typeof result.encrypted_value).toBe('string')
    // Encrypted value should be longer than the original
    expect(result.encrypted_value.length).toBeGreaterThan('gho_my_token'.length)
  })

  it('produces different ciphertext for different inputs', async () => {
    const { keyB64, keyId } = await makeTestPublicKeyB64()
    const r1 = await encryptSecret('token-a', keyB64, keyId)
    const r2 = await encryptSecret('token-b', keyB64, keyId)
    expect(r1.encrypted_value).not.toBe(r2.encrypted_value)
  })
})

describe('checkSecretExists', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns true when the secret exists', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))
    const exists = await checkSecretExists({
      token: 'gho_test',
      owner: 'testuser',
      repo: 'my-repo',
      secretName: 'CLAUDE_CODE_OAUTH_TOKEN',
    })
    expect(exists).toBe(true)
  })

  it('returns false on 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    const exists = await checkSecretExists({
      token: 'gho_test',
      owner: 'testuser',
      repo: 'my-repo',
      secretName: 'CLAUDE_CODE_OAUTH_TOKEN',
    })
    expect(exists).toBe(false)
  })

  it('throws on 403 instead of silently returning false', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))
    await expect(
      checkSecretExists({
        token: 'gho_test',
        owner: 'testuser',
        repo: 'my-repo',
        secretName: 'CLAUDE_CODE_OAUTH_TOKEN',
      }),
    ).rejects.toThrow('403')
  })
})

describe('putRepoSecret', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches the public key, encrypts, and PUTs the secret', async () => {
    const { keyB64, keyId } = await makeTestPublicKeyB64()
    const fakePublicKey = { key: keyB64, key_id: keyId }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(fakePublicKey) })
      .mockResolvedValueOnce({ ok: true, status: 201 })
    vi.stubGlobal('fetch', fetchMock)

    await putRepoSecret({
      token: 'gho_test',
      owner: 'testuser',
      repo: 'my-repo',
      secretName: 'CLAUDE_CODE_OAUTH_TOKEN',
      secretValue: 'gho_claude_token',
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const putCall = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(putCall[0]).toContain('CLAUDE_CODE_OAUTH_TOKEN')
    expect(putCall[1].method).toBe('PUT')
    const body = JSON.parse(putCall[1].body as string) as {
      encrypted_value: string
      key_id: string
    }
    expect(body.key_id).toBe(keyId)
    expect(body.encrypted_value).toBeTruthy()
  })

  it('throws when the PUT fails', async () => {
    const { keyB64, keyId } = await makeTestPublicKeyB64()
    const fakePublicKey = { key: keyB64, key_id: keyId }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(fakePublicKey) })
      .mockResolvedValueOnce({ ok: false, status: 403 })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      putRepoSecret({
        token: 'gho_test',
        owner: 'testuser',
        repo: 'my-repo',
        secretName: 'CLAUDE_CODE_OAUTH_TOKEN',
        secretValue: 'gho_claude_token',
      }),
    ).rejects.toThrow()
  })
})
