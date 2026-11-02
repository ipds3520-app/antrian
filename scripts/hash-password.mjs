import { hash } from "bcryptjs"

const password = process.argv[2]

if (!password) {
    console.error("Usage: npm run hash-password -- <password>")
    process.exit(1)
}

console.log(await hash(password, 12))
