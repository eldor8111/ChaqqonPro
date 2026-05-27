const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
prisma.staff.findMany().then(r => { 
  console.log(JSON.stringify(r.map(s => ({n:s.name, u:s.username, r:s.role, st:s.status})), null, 2)); 
  prisma.$disconnect(); 
}).catch(e=>{
  console.log(e); 
  prisma.$disconnect()
});
