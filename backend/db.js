import postgres from 'postgres'
import dns from 'dns'

// Force IPv4 resolution so Supabase works in IPv6-limited environments
dns.setDefaultResultOrder('ipv4first')

const connectionString = process.env.DATABASE_URL
const sql = postgres(connectionString)

export default sql
