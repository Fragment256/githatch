import sodium from 'libsodium-wrappers'

const API = 'https://api.github.com'

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

export interface EncryptedSecret {
  encrypted_value: string
  key_id: string
}

export async function encryptSecret(
  value: string,
  publicKeyBase64: string,
  keyId: string,
): Promise<EncryptedSecret> {
  await sodium.ready

  const publicKeyBytes = sodium.from_base64(publicKeyBase64, sodium.base64_variants.ORIGINAL)
  const messageBytes = sodium.from_string(value)
  const encryptedBytes = sodium.crypto_box_seal(messageBytes, publicKeyBytes)
  const encrypted_value = sodium.to_base64(encryptedBytes, sodium.base64_variants.ORIGINAL)

  return { encrypted_value, key_id: keyId }
}

export interface SecretParams {
  token: string
  owner: string
  repo: string
  secretName: string
}

export async function checkSecretExists(params: SecretParams): Promise<boolean> {
  const { token, owner, repo, secretName } = params
  const response = await fetch(`${API}/repos/${owner}/${repo}/actions/secrets/${secretName}`, {
    headers: authHeaders(token),
  })
  if (response.ok) return true
  if (response.status === 404) return false
  throw new Error(`Failed to check secret: ${response.status}`)
}

export interface PutSecretParams extends SecretParams {
  secretValue: string
}

export async function putRepoSecret(params: PutSecretParams): Promise<void> {
  const { token, owner, repo, secretName, secretValue } = params

  const keyResponse = await fetch(`${API}/repos/${owner}/${repo}/actions/secrets/public-key`, {
    headers: authHeaders(token),
  })
  if (!keyResponse.ok) {
    throw new Error(`Failed to fetch repo public key: ${keyResponse.status}`)
  }
  const { key, key_id } = (await keyResponse.json()) as { key: string; key_id: string }

  const { encrypted_value } = await encryptSecret(secretValue, key, key_id)

  const putResponse = await fetch(`${API}/repos/${owner}/${repo}/actions/secrets/${secretName}`, {
    method: 'PUT',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ encrypted_value, key_id }),
  })

  if (!putResponse.ok) {
    throw new Error(`Failed to store secret: ${putResponse.status}`)
  }
}
