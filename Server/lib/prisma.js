import pkg from "@prisma/client"
// import { PrismaClient } from './prisma/generated/client'

// console.log('data base url',process.env.NEON_DATABASE_URL);
 const {PrismaClient} = pkg;

const prisma = new PrismaClient();


export default prisma;