import { jwtVerify, SignJWT } from "jose"

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "")

export interface TokenPayload {
    id: number
    email: string
    role: "client" | "admin"
}

export async function signToken(payload: TokenPayload) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(secret)
}

export async function verifyToken(token: string) {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as TokenPayload & {
        iat: number
        exp: number
    }
}
