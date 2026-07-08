import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  CognitoUserSession,
} from 'amazon-cognito-identity-js'

// ---------------------------------------------------------------------------
// Pool configuration — values come from Vite env vars (set in .env.local)
// ---------------------------------------------------------------------------
const poolData = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID as string,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID as string,
}

export const userPool = new CognitoUserPool(poolData)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface CognitoSession {
  accessToken: string
  idToken: string
  refreshToken: string
  /** ISO string from token payload */
  expiresAt: number
}

// ---------------------------------------------------------------------------
// login — returns tokens on success, throws on failure
// ---------------------------------------------------------------------------
export function cognitoLogin(
  email: string,
  password: string,
): Promise<CognitoSession> {
  return new Promise((resolve, reject) => {
    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    })

    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool })

    cognitoUser.authenticateUser(authDetails, {
      onSuccess(session: CognitoUserSession) {
        resolve(extractSession(session))
      },
      onFailure(err) {
        reject(err)
      },
    })
  })
}

// ---------------------------------------------------------------------------
// register — creates account, returns the CognitoUser (not logged-in yet)
// After sign-up Cognito may require email confirmation (handled separately)
// ---------------------------------------------------------------------------
export function cognitoRegister(
  name: string,
  email: string,
  password: string,
): Promise<CognitoSession> {
  return new Promise((resolve, reject) => {
    const attributes = [
      new CognitoUserAttribute({ Name: 'email', Value: email }),
      new CognitoUserAttribute({ Name: 'name', Value: name }),
    ]

    userPool.signUp(email, password, attributes, [], (err, result) => {
      if (err || !result) {
        reject(err ?? new Error('Sign-up failed'))
        return
      }

      // Auto-login after successful registration
      cognitoLogin(email, password).then(resolve).catch(reject)
    })
  })
}

// ---------------------------------------------------------------------------
// refresh — refreshes tokens using the stored Cognito session
// ---------------------------------------------------------------------------
export function cognitoRefresh(): Promise<CognitoSession | null> {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser()
    if (!cognitoUser) {
      resolve(null)
      return
    }

    cognitoUser.getSession(
      (err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session || !session.isValid()) {
          resolve(null)
          return
        }
        resolve(extractSession(session))
      },
    )
  })
}

// ---------------------------------------------------------------------------
// logout — signs out both locally and globally (revokes tokens)
// ---------------------------------------------------------------------------
export function cognitoLogout(): void {
  const cognitoUser = userPool.getCurrentUser()
  cognitoUser?.signOut()
}

// ---------------------------------------------------------------------------
// Helper — extract token strings from a CognitoUserSession
// ---------------------------------------------------------------------------
function extractSession(session: CognitoUserSession): CognitoSession {
  return {
    accessToken: session.getAccessToken().getJwtToken(),
    idToken: session.getIdToken().getJwtToken(),
    refreshToken: session.getRefreshToken().getToken(),
    expiresAt: session.getAccessToken().getExpiration() * 1000, // ms
  }
}
